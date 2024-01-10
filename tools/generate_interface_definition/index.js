const fs = require('fs-extra')
const path = require('path')
const yaml = require('js-yaml')
const toTable = require('markdown-table')
const { difference } = require('lodash')

const HEADERS = [
  {
    text: 'No',
    align: 'right',
  },
  {
    text: 'キー',
    align: 'center',
  },
  {
    text: '項目名',
    align: 'left',
  },
  {
    text: '項目ID',
    align: 'left',
  },
  {
    text: '型',
    align: 'center',
  },
  {
    text: '必須',
    align: 'center',
  },
  {
    text: '備考',
    align: 'left',
  },
]

function main(workPath, schemaPath, templatePath) {
  const files = listDefinitionFiles(schemaPath)

  console.log('process these files')
  for (const f of files) {
    console.log('  ' + f)
  }

  let placeholderText = ''

  for (const file of files) {
    const schema = readSchema(file)

    if (schema.hidden) {
      continue
    }

    const tableEntity = generateTable(schema)

    placeholderText += `### ${tableEntity.title}\n\n`
    placeholderText += `ファイル名: ${tableEntity.filename}\n\n`
    placeholderText += `${tableEntity.tableText}\n\n`
    if (schema.comment) {
      placeholderText += `::: tip 補足\n`
      placeholderText += `${schema.comment}\n`
      placeholderText += `:::\n\n`
    }
  }

  const md = fs.readFileSync(templatePath, 'utf-8')
    .replace('[placeholder]', placeholderText)

  write(workPath, md)
}

function listDefinitionFiles(dir) {
  const order = yaml.safeLoad(fs.readFileSync(path.join(dir, '__order.yaml'), 'utf-8'))
  const files = order.map(prefix => `${prefix}.yaml`)

  // __order.yamlに載っていないyamlファイルを一応末尾に追加
  const allFiles = fs.readdirSync(dir).filter(f => f.endsWith('.yaml') && !f.startsWith('__'))
  const diff = difference(allFiles, files)
  files.push(...diff)

  return files.map(f => path.join(dir, f))
}

function readSchema(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  return yaml.safeLoad(content)
}

function generateTable(schema) {
  let index = 1

  const toRow = (field) => {
    return [
      index++,
      field.key ? '○' : '',
      field.description,
      field.name,
      field.type,
      field.required ? '○' : '',
      field.comment,
    ]
  }

  const table = toTable(
    [
      HEADERS.map(h => h.text),
      ...schema.fields.map(f => toRow(f)),
    ],
    {
      align: HEADERS.map(h => h.align.substr(0, 1))
    }
  )

  return {
    title: schema.name,
    filename: schema.filename,
    tableText: table,
  }
}

function write(workPath, data) {
  fs.writeFileSync(path.join(workPath, 'index.md'), data)
}

main(
  process.argv[2], // ワークフォルダパス
  process.argv[3], // スキーマファイルパス
  process.argv[4], // ドキュメントテンプレートパス
)
