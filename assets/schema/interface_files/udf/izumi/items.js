// 必須ではない日付項目が "00000000" で送られてきているようです。
// ※ 発注開始・終了日、取扱開始・終了日
//
// is_order_stopped (Boolean) の項目に"9"などが入っているようなので
// 不正な値はnullに変換します。
//
// 本来ならフォーマットチェックで不正なのですが、古いバージョンのフォーマット
// 定義ではあながちアリっぽいので、カスタムフォーマッタでyyyymmdd形式でない
// 日付はnullにします。
// 正規の列数でない場合、どの列が該当するのか判断できないので何もせずに
// 終了します。その場合、取り込み処理の列数チェックで引っかかるはずです。

function format(line) {
  var elements = line.split('\t')

  if (elements.length != 35) {
    return line
  }

  var orderStartedOn = elements[22]
  var orderTerminatedOn = elements[23]
  var handleStartedOn = elements[24]
  var handleTeminatedOn = elements[25]

  if (!isDate(orderStartedOn)) {
    orderStartedOn = ""
  }
  if (!isDate(orderTerminatedOn)) {
    orderTerminatedOn = ""
  }
  if (!isDate(handleStartedOn)) {
    handleStartedOn = ""
  }
  if (!isDate(handleTeminatedOn)) {
    handleTeminatedOn = ""
  }

  var isOrderStopped = elements[27].trim()
  if (isOrderStopped !== "0" && isOrderStopped !== "1") {
    isOrderStopped = ""
  }

  return [
    elements[0], elements[1], elements[2], elements[3], elements[4], elements[5], elements[6], elements[7], elements[8], elements[9],
    elements[10], elements[11], elements[12], elements[13], elements[14], elements[15], elements[16], elements[17], elements[18], elements[19],
    elements[20], elements[21], orderStartedOn, orderTerminatedOn, handleStartedOn, handleTeminatedOn, elements[26], isOrderStopped, elements[28], elements[29],
    elements[30], elements[31], elements[32], elements[33], elements[34],
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

  // 日付に変換できない発注開始・終了日、取扱開始・終了日は空にする
  // Boolean(0/1)でない発注停止フラグは空にする
  input = [
    "company_code", "item_code", "item_name", "item_kana_name", "item02_code", "item02_name", "item02_kana_name", "item03_code", "item03_name", "item03_kana_name",
    "control_no", "gauge", "category_code", "composite qty", "sales_unit_price", "original_unit_price", "list price", "handle_type", "lot_size", "order_unit_qty",
    "supplier_code", "maker_code", "00000000", "00000000", "00000000", "00000000", "tax_type", "is_order_stopped", "size_width", "size_height",
    "size_depth", "host_created_on", "host_updated_on", "host_outputed_on", "is_deleted",
  ].join('\t')
  var output = format(input)
  var expected = [
    "company_code", "item_code", "item_name", "item_kana_name", "item02_code", "item02_name", "item02_kana_name", "item03_code", "item03_name", "item03_kana_name",
    "control_no", "gauge", "category_code", "composite qty", "sales_unit_price", "original_unit_price", "list price", "handle_type", "lot_size", "order_unit_qty",
    "supplier_code", "maker_code", "", "", "", "", "tax_type", "", "size_width", "size_height",
    "size_depth", "host_created_on", "host_updated_on", "host_outputed_on", "is_deleted",
  ].join('\t')
  if (output !== expected) {
    return false
  }

  // 日付と判断できる発注開始・終了日、取扱開始・終了日はそのまま
  // 0または1の発注停止フラグはそのまま
  input = [
    "company_code", "item_code", "item_name", "item_kana_name", "item02_code", "item02_name", "item02_kana_name", "item03_code", "item03_name", "item03_kana_name",
    "control_no", "gauge", "category_code", "composite qty", "sales_unit_price", "original_unit_price", "list price", "handle_type", "lot_size", "order_unit_qty",
    "supplier_code", "maker_code", "20210101", "20210102", "20210103", "20210104", "tax_type", "0", "size_width", "size_height",
    "size_depth", "host_created_on", "host_updated_on", "host_outputed_on", "is_deleted",
  ].join('\t')
  var output = format(input)
  expected = [
    "company_code", "item_code", "item_name", "item_kana_name", "item02_code", "item02_name", "item02_kana_name", "item03_code", "item03_name", "item03_kana_name",
    "control_no", "gauge", "category_code", "composite qty", "sales_unit_price", "original_unit_price", "list price", "handle_type", "lot_size", "order_unit_qty",
    "supplier_code", "maker_code", "20210101", "20210102", "20210103", "20210104", "tax_type", "0", "size_width", "size_height",
    "size_depth", "host_created_on", "host_updated_on", "host_outputed_on", "is_deleted",
  ].join('\t')
  if (output !== expected) {
    return false
  }

  // 日付と判断できる発注開始・終了日、取扱開始・終了日はそのまま
  // 0または1の発注停止フラグはそのまま
  input = [
    "company_code", "item_code", "item_name", "item_kana_name", "item02_code", "item02_name", "item02_kana_name", "item03_code", "item03_name", "item03_kana_name",
    "control_no", "gauge", "category_code", "composite qty", "sales_unit_price", "original_unit_price", "list price", "handle_type", "lot_size", "order_unit_qty",
    "supplier_code", "maker_code", "20210101", "20210102", "20210103", "20210104", "tax_type", "1", "size_width", "size_height",
    "size_depth", "host_created_on", "host_updated_on", "host_outputed_on", "is_deleted",
  ].join('\t')
  var output = format(input)
  expected = [
    "company_code", "item_code", "item_name", "item_kana_name", "item02_code", "item02_name", "item02_kana_name", "item03_code", "item03_name", "item03_kana_name",
    "control_no", "gauge", "category_code", "composite qty", "sales_unit_price", "original_unit_price", "list price", "handle_type", "lot_size", "order_unit_qty",
    "supplier_code", "maker_code", "20210101", "20210102", "20210103", "20210104", "tax_type", "1", "size_width", "size_height",
    "size_depth", "host_created_on", "host_updated_on", "host_outputed_on", "is_deleted",
  ].join('\t')
  if (output !== expected) {
    return false
  }

  return true
}
