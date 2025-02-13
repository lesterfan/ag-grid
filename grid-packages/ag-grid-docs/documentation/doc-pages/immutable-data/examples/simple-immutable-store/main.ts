import { ColumnApi, GridOptions } from '@ag-grid-community/core'

function getInitialData() {
  var data = []
  for (var i = 0; i < 5; i++) {
    data.push(createItem())
  }

  return data
}

var immutableStore: any[] = []

function addFiveItems(append: boolean) {
  var newStore = immutableStore.slice()
  for (var i = 0; i < 5; i++) {
    var newItem = createItem()
    if (append) {
      newStore.push(newItem)
    } else {
      newStore.splice(0, 0, newItem)
    }
  }
  immutableStore = newStore
  gridOptions.api!.setRowData(immutableStore)
}

function removeSelected() {
  var selectedRowNodes = gridOptions.api!.getSelectedNodes()
  var selectedIds = selectedRowNodes.map(function (rowNode) {
    return rowNode.id
  })
  immutableStore = immutableStore.filter(function (dataItem) {
    return selectedIds.indexOf(dataItem.symbol) < 0
  })
  gridOptions.api!.setRowData(immutableStore)
}

function setSelectedToGroup(newGroup: string) {
  var selectedRowNodes = gridOptions.api!.getSelectedNodes()
  var selectedIds = selectedRowNodes.map(function (rowNode) {
    return rowNode.id
  })
  immutableStore = immutableStore.map(function (dataItem) {
    var itemSelected = selectedIds.indexOf(dataItem.symbol) >= 0
    if (itemSelected) {
      return {
        // symbol and price stay the same
        symbol: dataItem.symbol,
        price: dataItem.price,
        // group gets the group
        group: newGroup,
      }
    } else {
      return dataItem
    }
  })
  gridOptions.api!.setRowData(immutableStore)
}

function updatePrices() {
  var newStore: any[] = []
  immutableStore.forEach(function (item) {
    newStore.push({
      // use same symbol as last time, this is the unique id
      symbol: item.symbol,
      // group also stays the same
      group: item.group,
      // add random price
      price: Math.floor(Math.random() * 100),
    })
  })
  immutableStore = newStore
  gridOptions.api!.setRowData(immutableStore)
}

function filter(list: any[], callback: any) {
  var filteredList: any[] = []
  list.forEach(function (item) {
    if (callback(item)) {
      filteredList.push(item)
    }
  })
  return filteredList
}

function createItem() {
  var item = {
    group: 'A',
    symbol: createUniqueRandomSymbol(),
    price: Math.floor(Math.random() * 100),
  }
  return item
}

function onGroupingEnabled(enabled: boolean) {
  setGroupingEnabled(enabled, gridOptions.columnApi!)
}

function setGroupingEnabled(enabled: boolean, columnApi: ColumnApi) {
  if (enabled) {
    columnApi.applyColumnState({
      state: [
        { colId: 'group', rowGroup: true, hide: true },
        { colId: 'symbol', hide: true },
      ],
    })
  } else {
    columnApi.applyColumnState({
      state: [
        { colId: 'group', rowGroup: false, hide: false },
        { colId: 'symbol', hide: false },
      ],
    })
  }

  setItemVisible('groupingOn', !enabled)
  setItemVisible('groupingOff', enabled)
}

function setItemVisible(id: string, visible: boolean) {
  var element = document.querySelector('#' + id)! as any;
  element.style.display = visible ? 'inline' : 'none'
}

// creates a unique symbol, eg 'ADG' or 'ZJD'
function createUniqueRandomSymbol() {
  var symbol: any;
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

  var isUnique = false
  while (!isUnique) {
    symbol = ''
    // create symbol
    for (var i = 0; i < 3; i++) {
      symbol += possible.charAt(Math.floor(Math.random() * possible.length))
    }
    // check uniqueness
    isUnique = true
    immutableStore.forEach(function (oldItem) {
      if (oldItem.symbol === symbol) {
        isUnique = false
      }
    })
  }

  return symbol
}

function reverseItems() {
  immutableStore.reverse()
  gridOptions.api!.setRowData(immutableStore)
}

const gridOptions: GridOptions = {
  columnDefs: [
    { headerName: 'Symbol', field: 'symbol' },
    { headerName: 'Price', field: 'price' },
    { headerName: 'Group', field: 'group' },
  ],
  defaultColDef: {
    width: 250,
    sortable: true,
    resizable: true,
  },
  immutableData: true,
  animateRows: true,
  rowSelection: 'multiple',
  autoGroupColumnDef: {
    headerName: 'Symbol',
    cellRenderer: 'agGroupCellRenderer',
    field: 'symbol',
  },
  statusBar: {
    statusPanels: [{ statusPanel: 'agAggregationComponent', align: 'right' }],
  },
  groupDefaultExpanded: 1,
  rowData: immutableStore,
  getRowNodeId: function (data) {
    return data.symbol
  },
  onGridReady: function (params) {
    immutableStore = []
    immutableStore = getInitialData()
    params.api.setRowData(immutableStore)
    setGroupingEnabled(false, params.columnApi)
  },
}

// after page is loaded, create the grid.
document.addEventListener('DOMContentLoaded', function () {
  var eGridDiv = document.querySelector('#myGrid')
  new agGrid.Grid(eGridDiv, gridOptions)
})
