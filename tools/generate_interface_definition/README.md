# 連携ファイルフォーマット定義ドキュメント生成

連携ファイルフォーマットの定義ドキュメントをスキーマ定義yamlから生成します。

## Template

`./template.md`の`[placeholder]`に各連携ファイルの定義が挿入されます。

各連携ファイルのフォーマット定義は`/batch/src/schema/interface_files/*.yaml`を参照します。`__order.yaml`に記載された順番に出力され、当該ファイルに記載のない連携ファイルはアルファベット順に末尾に追加されます。

## 出力

```text
npm run build
```

`/dist/連携ファイルフォーマット定義書`に`index.md`と`page`が作成されます。
