# BiZOOPeバッチ

![build docs](https://github.com/bizoope/bizoope-batch/workflows/build%20docs/badge.svg)
![text_to_bigquery_test](https://github.com/bizoope/bizoope-batch/workflows/TextToBigQuery%20test/badge.svg)
![functions test](https://github.com/bizoope/bizoope-batch/workflows/functions%20test/badge.svg)
![batch test](https://github.com/bizoope/bizoope-batch/workflows/batch%20test/badge.svg)
[![Dataflow UDF (Javascript) Test](https://github.com/bizoope/bizoope-batch/actions/workflows/dateflow_udf_test.yaml/badge.svg)](https://github.com/bizoope/bizoope-batch/actions/workflows/dateflow_udf_test.yaml)

[GCP環境のドキュメントはこちら](./Deploy.md)

## イベント駆動処理

連携ファイル受信をトリガーにBigQueryへのマージまでを随時処理として行います。

![import_work_bq](images/import_work_bq.jpg)

連携元企業（= SITE）1社毎にバケットを用意し、Read, Write権限を与えます。

> バケット名は全プロジェクト間で一意にする必要があるので、"backup"などの名前はもう取られていて使えません。実際には先頭にプロジェクトIDを付けるなどの対応を行います。

### バックアップとワークテーブル取込バケットへの移動

`連携ファイル授受バケット(interface_xxx)`への**ファイル配置**をトリガーに処理を開始します。

1. 受信ファイルを`バックアップバケット(backup)`に**コピー**する。
2. コピーが完了した後、`ワークテーブル取込バケット(load_bq)`に**移動**する。

サイト識別子は、`連携ファイル授受バケット(interface_xxx)`に付与された`site_id`ラベルを使用します。

> `バックアップバケット(backup)`にコピーされたファイルは、[別Function](./functions/archive/main.py)がGZIP圧縮して`長期アーカイブバケット(archive)`に移動します。

[Cloud Function](./functions/receive_files/main.py)

### BigQueryワークテーブルへのロード

`ワークテーブル取込バケット(load_bq)`へのファイル配置をトリガーに、BigQueryワークテーブルへの取込みを行います。

1. スキーマ定義ファイルを基にフォーマット検証を行い、フォーマット不正行を除外する。
2. キー項目が重複している行を除外する（基幹出力日付時刻が一番新しい行のみ採用する）。
3. BigQueryワークテーブルを作成し、除外されなかった行を追加する。

除外された行は、末尾に除外となった原因を付与して、`一時バケット(temp)`にファイル出力します。

例（実際にTSVですが見易さのためCSVで記載）

```csv
20200101,item,abc,(could not parse "abc" as interger)
```

[Cloud Function](./functions/load_bq_work/main.py)

[Dataflow](./dataflow/text_to_bigquery/README.md)

概要図は簡略化のために詳細を省略しています。実際にはCloud FunctionからDataflowを呼んでるわけではありません。Cloud Functionからキュータスクを作成し、そのキューが[AppEngine](./app_engine/main.py)のエンドポイントを呼び出します。これは、Compute Engineインスタンス上限数などの制約上、Dataflowの同時実行数を制限したいためです（調査時のメモは[このあたり](./misc/AppEngine.md)）。

### エラーファイル返却

BigQueryワークテーブルへのロードで`一時バケット(temp)`に出力された除外行ファイルを`連携ファイル授受バケット(interface_xxx)`にコピーします。

エラーファイルはあくまでデータ送信ユーザーへのフィードバックです。エラーがなかった場合でも0バイトのファイルが作成されます。

`一時バケット(temp)`のファイルの削除等はバケットの保持ポリシーに従い、手動で削除は行いません。

[Cloud Function](./functions/file_load_errors/main.py)

### 本テーブルへのMerge

テーブルが空になる瞬間をなくすため、本テーブルへの取込はMerge文を使います。

各ワークテーブル毎マージ定義yamlを参照し、1) ワークテーブルからマージ用データをSelect 2) Select結果を本テーブルにマージ します。

* マージ用データには必ず`is_deleted`を含めてください。
  * 連携ファイルのフォーマットは原則そうなっています。
* `created_at`, `updated_at`はマージ先テーブルに存在していたとしてもマージ用データには不要です（マージ時に自動的に補完されます）。

[Cloud Function](./functions/merge_into_idpos/main.py)

### 付録（連携企業が増えた際に必要なタスク）

* サービスアカウントに紐付いたキーファイル（json）の作成
* キーファイルの配布

新しいサイト定義を[tfvarファイル](./infrastructure/tfvars/production.tfvars)に追加してGithubにPushすれば、連携用バケットとそのバケットに諸々権限を持つサービスアカウントが作成されます。そのサービスアカウントのキーをCloud Consoleから作成して客先に送付します。

## 定時バッチ処理

処理時間が一定ではない、且つ長時間かかることが予想されるため、バッチ処理はCloud Functionsでは実施しません（Cloud Functionsの制限として、メモリは最大2GB、実行時間最大9分、があります）。

定時がきたら、バッチ処理用Compute Engineインスタンスを**作成**し、そこでバッチ処理を実行します。ワークフロー制御にはDigdagを使用します。

![バッチ処理](images/batch.jpg)

### 整合性合わせ

未登録商品の登録などの整合性を合わせる処理を行います。

### 週次処理

便宜上「週次処理」と呼んでいますが、処理自体は日次処理のあとに**毎日**実行されます。

便宜上日次・週次・月次処理と分けていますが、実際にはすべて毎日呼び出します。例えば顧客セグメントデータ作成は週毎作成されますが、内部的にはデータ未作成の週をピックアップしてすべて作成します。通常は週に一回未作成週分を作成することになります。

### 月次処理

TODO 週次処理と同じ考え方

## ~~Cloud SQL(PostgreSQL) へマスタデータコピー~~

**画面側プロジェクトに移行します。**

BigQueryにロードしたマスタデータをCloud SQLにキャッシュとしてコピーします。コピーとはいえ全てがそのままの形式でコピーされる訳ではないことに注意してください（不要列の削除や、ヘッダ・明細への分割などが実行されるテーブルもあります）。

データコピーは[Embulk](https://www.embulk.org/)を使用し、原則BigQueryへのSelectのみで出力可能なデータのみ対象とします。

> サーバーレスと考えるとDataflowがいい気がしますが、実績・お手軽感からEmbulkでの処理としました。

この処理でコピーするのはBigQueryマスタデータのキャッシュ扱いなので、Modeは全てREPLACEです。

作成するキャッシュはアプリケーションでの利用を目的にしており、本来出力定義はアプリケーション側にあるのが自然な気がしますが、処理の見易さを考慮しバッチ処理内で行います。後々この部分だけ独立させられるよう日次や週次処理と強く依存しないようにしてください。

どうやるのがいいか調査中。詳しくは[Embulk調査メモ](misc/PostgreSQLへのデータコピー.md)。

今のところは、ワークテーブル（キャッシュテーブルの形式）作成 -> GCSにExport（CSV） -> Embulk（in:csv out:PostgreSQL）

![マスタデータキャッシュ](images/bq_to_cloud_sql.jpg)

> なんだかEmbulkしなくてもCSVを普通にCloud SQLにimportすればいいのでは？となってしまった。まぁ並列読込やテーブル削除、リネームなどを内部的によしなにやってくれる部分を使っていると思って…

## 設定値（システムマスタ的なアレ）の取得

未登録商品コードなど各種設定値はAPIから取得します。以前はPostgreSQLにシステムマスタがあってSQL内で直接参照していましたが、BigQueryを中心に据えたたため若干不便になってしまいました。また、SQLに含めてしまうとSQLで参照できる場所にシステムマスタが存在しなければならず、移動できなくなってしまうので分離することにしました。

内部的にはただyamlファイルをGCSに転がして、それを読んで返すだけのCloud Functionsです。

## ログ

Cloud Functionsの場合、毎回同じインスタンスで実行されている保証はないので、ローカルに信頼できるログファイルを作成することは困難です。バッチ処理も、作成された専用のインスタンスはバッチ処理終了後削除されるため、ログはローカル以外に保持しておきたいです。そこで、原則ログは全てCloud Loggingに保存することにします。

Cloud Loggingに出力されたログは[ここ](https://console.cloud.google.com/logs)で参照できます。

### Cloud Functions

Pythonの場合、Cloud Functions上から`print`を行うと自動的にCloud Loggingに追加されます。

[ドキュメント](https://cloud.google.com/functions/docs/monitoring/logging?hl=ja#writing_runtime_logs)では`print`で出力した場合ログレベルはDEBUGになると書いてありましたが、実際にやってみたらINFOで出ました。

もう一点注意点として、`print`に辞書を渡しても、`textPayload`に辞書の文字列表現が出力されるだけでクエリに使用することはできません。

Cloud Functions `print`のログエントリー

```json
{
  "textPayload": "This is a log message.",
  "insertId": "000000-345eb55c-e201-44a1-b624-056e0202f694",
  "resource": {
    "type": "cloud_function",
    "labels": {
      "region": "us-central1",
      "function_name": "function-1",
      "project_id": "batch-test-280909"
    }
  },
  "timestamp": "2020-08-25T23:53:47.437Z",
  "severity": "INFO",
  "labels": {
    "execution_id": "8p6a1m8fh56u"
  },
  "logName": "projects/batch-test-280909/logs/cloudfunctions.googleapis.com%2Fcloud-functions",
  "trace": "projects/batch-test-280909/traces/fed29b4650d690df899cb8670750b156",
  "receiveTimestamp": "2020-08-25T23:53:58.213425086Z"
}
```

関数で例外をraiseしてもCloud Loggingには記録**されません**（前はERRORで出力されていた気がしたんですが…そもそも[補足されない例外を投げてはいけません](https://cloud.google.com/functions/docs/bestpractices/tips#error_reporting)。）。エラーログを出力する場合、`logging.error`を使用します。

> デプロイする関数がExceptionが投げたら`logging.error`を行うようにデコレータを設定しています。

エラーログエントリー

```json
{
  "textPayload": "An error occurred.",
  "insertId": "000000-46c6c2b5-e2b8-4e88-be5e-fb73cf311bd2",
  "resource": {
    "type": "cloud_function",
    "labels": {
      "region": "us-central1",
      "project_id": "batch-test-280909",
      "function_name": "function-1"
    }
  },
  "timestamp": "2020-08-26T00:34:21.685Z",
  "severity": "ERROR",
  "labels": {
    "execution_id": "5hjyfnbpdg24"
  },
  "logName": "projects/batch-test-280909/logs/cloudfunctions.googleapis.com%2Fcloud-functions",
  "trace": "projects/batch-test-280909/traces/e9fa7f11c178af9a7207b92c758f5e44",
  "receiveTimestamp": "2020-08-26T00:34:32.065843882Z"
}
```

Cloud Functionsのログを絞り込むクエリ

```text
resource.type="cloud_function"
resource.labels.function_name="function-1" // 関数名も含める場合
```

### 定時バッチ処理のログ

Cloud Loggingに`jsonPayload.python_logger = idpos_batch`でログを出力します。ログビューアで以下のクエリで参照可能です。`jsonPayload.message`にはサイトIDとジョブIDが含まれていて、それらも条件に含めることができます。

```text
jsonPayload.python_logger="idpos_batch"
jsonPayload.message.site_id="site"
jsonPayload.message.job_id="job_id"
```

ログの形式（jsonPayload部分）は以下の通りです。

```json
{
  // ...
  "jsonPayload": {
    "message": {
      "job_id": "job_id",
      "site_id": "site_id",
      "message": {
        "function": { // タスクとして実行したFunction情報
          "name": "merge_into_idpos_ds_batch",
          "args": [],
          "kwargs": {
            "dest_dataset": "project.dataset",
            "work_tables": {
              "journal": "batchwork_journal_job"
            },
            "work_dataset": "batch_work",
            "merge_definition_path": "../sql/bigquery/merge_bq_work",
            "bq_table_schema_path": "../schema/bigquery"
          }
        },
        "took": 18 // 所要時間（秒）
      }
    },
    "python_logger": "idpos_batch"
  },
  // ...
}
```

### ログの長期保存

Cloud Loggingビューアーでは過去30日間のログしか保存されないので、定期的にExportする必要があります。Export先はCloud Storage、BigQuery、Pub/Subがあります。Pub/Subはそのメッセージを保存する方法を結局作成する必要があって面倒なので、Cloud Storage、またはBigQueryで対応します。

GCSにファイルで出力しておく方がお安く済みますが、BigQueryだとSQLでログの絞り込み等できるので便利そうです（BigQueryがものすごく高いということではないですが…）。一応BigQueryに作成する前提とします。

Exportするためには、Cloud Loggingからシンクを作成し出力先のBigQueryデータセットを指定します。

## エラー通知

通知のためのPub/SubとCloud Funtionを用意し、そこからChatworkに流します。各コンポーネント（Cloud Functionやバッチ処理Digdag）は「Pub/Subにメッセージ送信さえすれば何らかの方法で通知を送ってもらえる」状態にします。こうすることで、具体的な通知方法（メール？チャット？接続先情報は？）を一元管理します。

実際には、メールは環境構築が面倒なのでChatworkにメッセージをPOSTします。ChatworkならばHTTPリクエストさえ送信できればOKです。Pub/Subが受信するメッセージの形式はある程度形式化し、Severity（重大度）とMessage（メッセージ）で構成します。

> Severity=ErrorのみメンションをONにして通知するなどの工夫は通知のCloud Functionで行います。

![notification](images/notification.jpg)

## 備考

### Pythonスクリプトのドキュメント

Sphinxで生成したPythonスクリプトのドキュメントは[ここ](https://github.com/bizoope/bizoope-batch/tree/pydocs)にあります。このリポジトリはプライベートなので（無料では）Gihub Pagesが使えなかったため、ホスティングはしていません。

### ~~標準フォーマット以外で連携ファイルを受信する~~

想定以上に既存顧客の連携フォーマットはバラバラ、新標準との乖離が激しかったです。あと、連携フォイルを追加する度に以下の対処だけで取込みができるのか不安があります (例えば、標準形式にするためには今2種類もらっているデータを結合しないといけない！、など) 。なのでもう割り切ってこのバッチは標準フォーマットを受信するだけとします。Dataflowのカスタムフォーマッターレベルでできるものは良いですが、変換処理を持たせるGCPプロジェクトをどこか別に作成し、そこで変換・このプロジェクトに送信、を行ってください。

~~標準フォーマッチ以外で連携ファイルを受信する場合（既存企業の想定）、「バックアップとワークテーブル取込バケットへの移動」を差替えます。~~

> ~~このポイントのみ各企業のバケットへの処理紐づけを行うので。これ以降は全て共通処理にしたい。~~

~~以下のルールでカスタム処理を作ってください。~~

* ~~受信したオリジナルの非圧縮ファイルを`バックアップバケット(backup)`に配置する。~~
* ~~標準フォーマットに加工したファイルを`ワークテーブル取込バケット(load_bq)`に配置する。~~

### 各種レガシー資料

今まで社内の共有フォルダなどに入れていた古いExcelの資料とか… たまにみたいヤツ。

本来はGoogle Driveの共有ドライブに入れておくのが良いのでしょうが、プラン的にできないのでちゃんとした置き場が確定するまでの暫定対処として[別ブランチ](https://github.com/bizoope/bizoope-batch/tree/doc)に突っ込んでおきました。単に紛失防止のためです。
