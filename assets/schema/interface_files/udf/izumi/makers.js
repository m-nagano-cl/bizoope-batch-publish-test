// いずみ市民生協では、少々古いバージョンのフォーマット定義を渡しているので
// company_codeが含まれていません。手動で追加しています。

function format(line) {
  return "6583\t" + line;
}

function test() {
  var input = "input";
  var output = format(input);
  var expected = "6583\tinput"
  return output === expected;
}
