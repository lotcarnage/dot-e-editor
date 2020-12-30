# ドット絵エディタ
本プロダクトは、Webブラウザ上で動作するドット絵（Pixel Art）エディタです。


[試してみる](https://lotcarnage.github.io/dot-e-editor/deliverable/dot-e-editor.html)

# 特徴
- HTMLファイル一つで構成したWebブラウザ上で動作するドット絵エディタです。
- サーバ上への配置が不要です。オフライン環境でもWebブラウザで読みこむ事で動作します。
- インデックスカラーパレットでドット絵を編集するため、後から色調整しやすいです。
- ファイルの保存先はローカルストレージのファイルです。ファイル名はユーザーが任意に指定できます。
- インデックスカラーWindowsBitmap形式で画像とパレットを保存できます。
- 対応予定：パレット情報をJSON形式で保存／読込できます。
- 対応予定：スクリプト入力により、自作のフィルタ処理を画像に施す事ができたり、機能を独自に拡張する事ができます。

# ビルド方法
cloneした後のプロジェクトディレクトリで``npm install``を実行してビルド環境をインストールしてください。
ビルド環境のインストールが成功したら、``npm run build``でプロジェクトをビルドしてください。
プロジェクトの最終的な成果物は``deliverable/dot-e-editor.html``です。

``built``は中間生成物ディレクトリです。破棄しても構いません。

``npm run clean``を実行することで、成果物``deliverable``および``built``をローカルから削除します。
