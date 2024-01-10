// 必須ではない日付項目が "00000000" で送られてきているようです。
// ※ 入会日、生年月日、基幹登録日（入会日が入っているっぽい）
//
// 本来ならフォーマットチェックで不正なのですが、古いバージョンのフォーマット
// 定義ではあながちアリっぽいので、カスタムフォーマッタでyyyymmdd形式でない
// 日付はnullにします。必須項目はどうにもならないので変換しません。
// 正規の列数でない場合、どの列が該当するのか判断できないので何もせずに
// 終了します。その場合、取り込み処理の列数チェックで引っかかるはずです。

function format(line) {
  var elements = line.split('\t')

  if (elements.length != 11) {
    return line
  }

  // 日付項目
  var admissionYmd = elements[3]
  var dateOfBirth = elements[4]
  var hostCreatedOn = elements[7]

  if (!isDate(admissionYmd)) {
    admissionYmd = ""
  }
  if (!isDate(dateOfBirth)) {
    dateOfBirth = ""
  }
  if (!isDate(hostCreatedOn)) {
    hostCreatedOn = ""
  }

  // 郵便番号
  var zip = elements[6].replace('-', '')

  return [
    elements[0],
    elements[1],
    elements[2],
    admissionYmd,
    dateOfBirth,
    elements[5],
    zip,
    hostCreatedOn,
    elements[8],
    elements[9],
    elements[10],
  ].join('\t')
}

function isDate(value) {
  if (!value || value.trim() === "") {
    return false
  }
  if (!value.match(/^\d{8}$/)) {
    return false
  }
  var y = parseInt(value.substring(0, 4))
  var m = parseInt(value.substring(4, 6)) - 1
  var d = parseInt(value.substring(6, 8))

  var date = new Date(y, m, d);
  if (date.getFullYear() != y || date.getMonth() != m || date.getDate() != d) {
    return false
  }

  return true
}

// Tests ************************************************************

function test() {
  var input = null
  var output = null
  var expected = null

  // 日付に変換できない入会日・生年月日・基幹登録日は空にする
  input = [
    "col1", "col2", "col3", "col4", "col5",
    "col6", "col7", "col8", "col9", "col10",
    "col11",
  ].join('\t')
  var output = format(input)
  var expected = [
    "col1", "col2", "col3", "", "",
    "col6", "col7", "", "col9", "col10",
    "col11",
  ].join('\t')
  if (output !== expected) {
    return false
  }

  // 入会日だけ不正
  input = [
    "col1", "col2", "col3", "202010132", "20210101",
    "col6", "col7", "20210103", "col9", "col10",
    "col11",
  ].join('\t')
  var output = format(input)
  var expected = [
    "col1", "col2", "col3", "", "20210101",
    "col6", "col7", "20210103", "col9", "col10",
    "col11",
  ].join('\t')
  if (output !== expected) {
    return false
  }

  // 生年月日だけ不正
  input = [
    "col1", "col2", "col3", "20210101", "20210132",
    "col6", "col7", "20210103", "col9", "col10",
    "col11",
  ].join('\t')
  var output = format(input)
  var expected = [
    "col1", "col2", "col3", "20210101", "",
    "col6", "col7", "20210103", "col9", "col10",
    "col11",
  ].join('\t')
  if (output !== expected) {
    return false
  }

  // 基幹登録日だけ不正
  input = [
    "col1", "col2", "col3", "20210101", "20210101",
    "col6", "col7", "20210132", "col9", "col10",
    "col11",
  ].join('\t')
  var output = format(input)
  var expected = [
    "col1", "col2", "col3", "20210101", "20210101",
    "col6", "col7", "", "col9", "col10",
    "col11",
  ].join('\t')
  if (output !== expected) {
    return false
  }


  // 入会日・生年月日・基幹登録日ともに正常
  input = [
    "col1", "col2", "col3", "20210101", "20210131",
    "col6", "col7", "20210103", "col9", "col10",
    "col11",
  ].join('\t')
  var output = format(input)
  var expected = [
    "col1", "col2", "col3", "20210101", "20210131",
    "col6", "col7", "20210103", "col9", "col10",
    "col11",
  ].join('\t')
  if (output !== expected) {
    return false
  }

  // 郵便番号のハイフンは削除する
  input = [
    "col1", "col2", "col3", "20210101", "20210131",
    "col6", "123-4567", "20210103", "col9", "col10",
    "col11",
  ].join('\t')
  var output = format(input)
  var expected = [
    "col1", "col2", "col3", "20210101", "20210131",
    "col6", "1234567", "20210103", "col9", "col10",
    "col11",
  ].join('\t')
  if (output !== expected) {
    return false
  }

  return true
}
