# BiZOOPe | 連携ファイルフォーマット定義書

## ファイルフォーマット

| 項目       | 指定フォーマット |
| ---------- | ---------------- |
| 文字コード | **UTF-8**        |
| 区切り文字 | 水平タブ         |
| 囲み文字   | 不要             |
| ヘッダー   | なし             |
| 改行コード | Lf / CrLf        |

## 型

各連携ファイルフォーマットに記載されている**型**の定義は以下の通りです。以下形式に合致しない値がある行は取り込まれませんのでご注意ください。

| 型       | 備考                                                                |
| :------- | :------------------------------------------------------------------ |
| STRING   | 任意の文字列。200文字を超える場合、201文字目以降は切り捨てます。    |
| INTEGER  | 整数。小数点以下の数値が入力されている場合、小数第1位を切捨てます。 |
| NUMERIC  | 任意の数値。小数第4位を切捨てます。                                 |
| DATE     | `YYYYMMDD`形式の文字列                                              |
| DATETIME | `YYYYMMDDHHMISS`形式の文字列                                        |
| BOOLEAN  | `0`（=`false`）または`1`（=`true`）                                 |

::: tip その他の指定フォーマット
項目に依っては使用できる文字、フォーマットが限定されている場合があります。備考に記載されている場合はそちらに従ってください。
:::

## キー項目

キー項目（複数の項目で構成される場合もあります）が一致するデータは取込時に上書きされます。ただし、「基幹出力日時」が同一、若しくは新しい場合に限ります。同一ファイル内でキーが重複している場合、「基幹出力日時」新しい行が取り込まれる**候補**となります。ただし、既存データの「基幹出力日時」より古い場合は取り込まれません。

同一ファイル内でキーが重複しており「基幹出力日時」も同一場合、どの行が取込候補となるかの保証はありません。

## 必須項目

前後空白（半角スペース）は除去されるため、必須項目に空白文字（半角スペース）のデータは許可されません。

::: tip 必須項目以外
必須ではない項目であっても**項目自体**は常に含めてください。
:::

## 削除フラグ

削除フラグに`1`(=`true`)を指定することで、キーが一致するデータを削除することができます。削除は「基幹出力日時」が古い場合でも実行されます。

::: tip
データ保持期間外の売上データ（[ジャーナル](#ジャーナル)）をお客様ご自身で削除していただく必要はありません。
:::

## 各連携ファイルのフォーマット

<!-- スキーマ定義のテーブルが挿入されます -->
[placeholder]

## FAQ

### カードIDは自社で管理する番号を送ればいいの？

顧客の識別情報（ハウスカードの番号など）は個人情報と見なされます。BiZOOPeでは、それらの情報は匿名化（元の番号に復元できない文字列に変換）した状態でお送りいただきます。貴社での匿名化対応が難しい場合はご相談ください。

### 「未使用」って？

「未使用」は現在アプリケーションでは使用していない項目です。将来的な機能追加などで参照される可能性があるため用意しています（ご期待ください！ :tada: ）。お送りいただいていればスムーズに新機能がご利用いただけます！入力が難しい項目は空でお送りいただいて結構です。