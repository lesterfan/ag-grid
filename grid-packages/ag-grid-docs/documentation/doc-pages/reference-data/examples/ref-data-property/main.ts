import { CellValueChangedEvent, GridOptions, ICellRendererParams, ValueFormatterParams, ValueSetterParams } from '@ag-grid-community/core'

var carMappings = {
  tyt: 'Toyota',
  frd: 'Ford',
  prs: 'Porsche',
  nss: 'Nissan',
}

var colourMappings = {
  cb: 'Cadet Blue',
  bw: 'Burlywood',
  fg: 'Forest Green',
}

var carBrands = extractValues(carMappings)
var colours = extractValues(colourMappings)

const gridOptions: GridOptions = {
  columnDefs: [
    {
      field: 'make',
      cellEditor: 'select',
      cellEditorParams: {
        values: carBrands,
      },
      filter: 'agSetColumnFilter',
      refData: carMappings,
    },
    {
      field: 'exteriorColour',
      minWidth: 150,
      cellEditor: 'agRichSelectCellEditor',
      cellEditorPopup: true,
      cellEditorParams: {
        values: colours,
        cellRenderer: colourCellRenderer,
      },
      filter: 'agSetColumnFilter',
      filterParams: {
        cellRenderer: colourCellRenderer,
      },
      refData: colourMappings,
      cellRenderer: colourCellRenderer,
    },
    {
      field: 'interiorColour',
      minWidth: 150,
      filter: 'agSetColumnFilter',
      filterParams: {
        cellRenderer: colourCellRenderer,
      },
      refData: colourMappings,
      cellRenderer: colourCellRenderer,
    },
    {
      headerName: 'Retail Price',
      field: 'price',
      minWidth: 140,
      colId: 'retailPrice',
      valueGetter: function (params) {
        return params.data.price
      },
      valueFormatter: currencyFormatter,
      valueSetter: numberValueSetter,
    },
    {
      headerName: 'Retail Price (incl Taxes)',
      minWidth: 205,
      editable: false,
      valueGetter: function (params) {
        // example of chaining value getters
        return params.getValue('retailPrice') * 1.2
      },
      valueFormatter: currencyFormatter,
    },
  ],
  defaultColDef: {
    flex: 1,
    filter: true,
    editable: true,
  },
  rowData: getData(),
  onCellValueChanged: onCellValueChanged,
}

function onCellValueChanged(params: CellValueChangedEvent) {
  // notice that the data always contains the keys rather than values after editing
  console.log('onCellValueChanged: ', params)
}

function extractValues(mappings: Record<string, string>) {
  return Object.keys(mappings)
}

function colourCellRenderer(params: ICellRendererParams) {
  if (params.value === '(Select All)') {
    return params.value
  }

  return (
    '<span style="color: ' +
    removeSpaces(params.valueFormatted) +
    '">' +
    params.valueFormatted +
    '</span>'
  )
}

function currencyFormatter(params: ValueFormatterParams) {
  var value = Math.floor(params.value)

  if (isNaN(value)) {
    return ''
  }

  return '£' + value.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
}

function numberValueSetter(params: ValueSetterParams) {
  if (isNaN(parseFloat(params.newValue)) || !isFinite(params.newValue)) {
    return false // don't set invalid numbers!
  }

  params.data.price = params.newValue

  return true
}

function removeSpaces(str: string) {
  return str ? str.replace(/\s/g, '') : str
}

// wait for the document to be loaded, otherwise
// AG Grid will not find the div in the document.
document.addEventListener('DOMContentLoaded', function () {
  // lookup the container we want the Grid to use
  var eGridDiv = document.querySelector('#myGrid')

  // create the grid passing in the div to use together with the columns & data we want to use
  new agGrid.Grid(eGridDiv, gridOptions)
})
