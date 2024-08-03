// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "textra" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	function getText(){
		//アクティブなエディタのドキュメントを取得
		const activeEditor = vscode.window.activeTextEditor;
		const doc = activeEditor && activeEditor.document;
		//選択範囲を取得
		let selectedText:string[] = [];

		activeEditor?.selections.forEach(selection => {
			selectedText.push(doc?.getText(selection) || "");
		})
		console.log(selectedText.join('\n'));
		return selectedText;
	}

	function setText(context: string[]){
		//アクティブなエディタのドキュメントを取得
		const activeEditor = vscode.window.activeTextEditor;
		const doc = activeEditor && activeEditor.document;
		const selection = activeEditor?.selections.slice(-1)[0];
		//選択範囲を取得
		const lastLine = doc?.lineAt(doc?.lineCount - 1);
		const position = selection?.end || new vscode.Position(lastLine?.lineNumber || 0, lastLine?.text.length || 0);
		activeEditor?.edit(editBuilder => {
			editBuilder.insert(position, "\n" + context.join('\n'));
		}).then(succes => {
			if(succes) {
				// 選択範囲を変える
				const newSelection = new vscode.Selection(position.translate(context.length, 0), position.translate(1, 0));
				activeEditor.selection = newSelection;
				// コメントアウトを行う
				vscode.commands.executeCommand('editor.action.commentLine');
				// インデントを揃える
				vscode.commands.executeCommand('editor.action.formatSelection');
			}
		});
		
		console.log(context.join('\n'));
	}

	async function postData(url: string, data: { [key: string]: any}): Promise<any> {
		try{
			const formData = new FormData();
			for (const key in data) {
				if (data.hasOwnProperty(key)) {
					formData.append(key, data[key]);
				}
			}

			const response = await fetch(url, {
				method: "POST", // POSTメソッドを指定
				body: formData
			});
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const result = await response.json(); // レスポンスをJSON形式で取得
    		return result;
		} catch(error) {
			console.error('Error: ', error);
			throw error;
		}
	}
	
	let expires_in = 0; // Tokenの時間
	let expires_time = new Date();
	let access_token = "";
	function exchangeLange(context: string) {
		const token_url = "https://mt-auto-minhon-mlt.ucri.jgn-x.jp/oauth2/token.php";
		const exchange_url = "https://mt-auto-minhon-mlt.ucri.jgn-x.jp/api/mt/generalNT_en_ja/";
		
		const config = vscode.workspace.getConfiguration('textra_line_textte');
		const name = config.get<string>("name")
		const clinet_id = config.get<string>("clinet_id")
		const client_secret = config.get<string>("client_secret")

		const now = new Date();
		if (expires_time < now){
			return getJapaneseAndToken();
		}else {
			return getJapanese();
		}
		
		function getJapaneseAndToken(){
			console.log("get Token");
			return postData(token_url, {
					grant_type: "client_credentials",
					client_id: clinet_id,
					client_secret: client_secret
				}).then(data => {
					access_token = data.access_token;
					expires_in = data.expires_in;
					expires_time = new Date(now.getTime() + expires_in * 1000);
					return getJapanese();
				}).catch(error => {
					console.error("Error: ", error)
					vscode.window.showInformationMessage("Error: ", error);
					throw error
				});
		}

		function getJapanese(){
			console.log("get Japanese");
			return postData(exchange_url, {
					name: name,
					key: clinet_id,
					type:'json',
					access_token: access_token,
					text: context
				}).then(data => {
					return String(data.resultset.result.text);
				}).catch(error => {
					console.error("Error: ", error)
					vscode.window.showInformationMessage("Error: ", error);
					throw error
				});
		}

	}


	
	const exchangeLang = vscode.commands.registerCommand('textra_line_text.exchangeLang', async () => {
		await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "翻訳を取得中...",
            cancellable: false
		}, async (progress) => {
            progress.report({ increment: 0 });
			const selectedText = getText();
			const context = await exchangeLange(selectedText.join('\n'));
			setText(context.split('\n'));
            progress.report({ increment: 100 });
        });
        vscode.window.showInformationMessage('翻訳完了!');
	});

	const exchangeLangOneLine = vscode.commands.registerCommand('textra_line_text.exchangeLangOneLine', async () => {
		await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "翻訳を取得中...",
            cancellable: false
		}, async (progress) => {
			progress.report({ increment: 0 });
			const selectedText = getText();
			const context = await exchangeLange(selectedText.join(' '));
			setText([context]);
			progress.report({ increment: 100 });
        });
        vscode.window.showInformationMessage('翻訳完了!');
	});

	context.subscriptions.push(exchangeLang);
	context.subscriptions.push(exchangeLangOneLine);
}

// This method is called when your extension is deactivated
export function deactivate() {}
