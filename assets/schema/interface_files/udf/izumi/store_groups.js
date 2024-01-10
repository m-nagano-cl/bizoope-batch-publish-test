// いずみ市民生協では、少々古いバージョンのフォーマット定義を渡しているので
// store_nameが含まれています。当該列は不要なので削除します。
// 万が一29列 (本来の28列 + store_name) でない場合は何もせずにフォーマット
// チェックに進みます。

function format(line) {
  var elements = line.split('\t')

  if (elements.length != 29) {
    return line
  }

  return [
    elements[0],
    elements[1],
    elements[2],
    elements[3],
    // 削除
    elements[5],
    elements[6],
    elements[7],
    elements[8],
    elements[9],
    elements[10],
    elements[11],
    elements[12],
    elements[13],
    elements[14],
    elements[15],
    elements[16],
    elements[17],
    elements[18],
    elements[19],
    elements[20],
    elements[21],
    elements[22],
    elements[23],
    elements[24],
    elements[25],
    elements[26],
    elements[27],
    elements[28],
  ].join('\t')
}

function test() {
  input = [
    "col1", "col2", "col3", "col4", "col5",
    "col6", "col7", "col8", "col9", "col10",
    "col11", "col12", "col13", "col14", "col15",
    "col16", "col17", "col18", "col19", "col20",
    "col21", "col22", "col23", "col24", "col25",
    "col26", "col27", "col28", "col29",
  ].join('\t')
  var output = format(input)
  var expected = [
    "col1", "col2", "col3", "col4",
    "col6", "col7", "col8", "col9", "col10",
    "col11", "col12", "col13", "col14", "col15",
    "col16", "col17", "col18", "col19", "col20",
    "col21", "col22", "col23", "col24", "col25",
    "col26", "col27", "col28", "col29",
  ].join('\t')
 
  return output === expected
}
