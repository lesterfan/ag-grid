import {
    _,
    Autowired,
    BeanStub,
    CellRange,
    CellRangeType,
    ChartType,
    Column,
    ColumnModel,
    Constants,
    IAggFunc,
    IRangeService,
    PostConstruct,
    RowNode,
    RowRenderer,
    SeriesChartType,
    ValueService
} from "@ag-grid-community/core";
import { ChartDatasource, ChartDatasourceParams } from "./chartDatasource";
import { ChartTranslator } from './chartTranslator';

export interface ColState {
    column?: Column;
    colId: string;
    displayName: string | null;
    selected?: boolean;
    order: number;
}

export interface ChartModelParams {
    chartId: string;
    pivotChart: boolean;
    chartType: ChartType;
    chartThemeName: string;
    aggFunc?: string | IAggFunc;
    cellRange: CellRange;
    suppressChartRanges: boolean;
    unlinkChart?: boolean;
    crossFiltering?: boolean;
    seriesChartTypes?: SeriesChartType[];
}

export class ChartDataModel extends BeanStub {

    public static DEFAULT_CATEGORY = 'AG-GRID-DEFAULT-CATEGORY';

    @Autowired('columnModel') private readonly columnModel: ColumnModel;
    @Autowired('valueService') private readonly valueService: ValueService;
    @Autowired('rangeService') private readonly rangeService: IRangeService;
    @Autowired('rowRenderer') private readonly rowRenderer: RowRenderer;
    @Autowired('chartTranslator') private readonly chartTranslator: ChartTranslator;

    // this is used to associate chart ranges with charts
    public readonly chartId: string;

    public readonly suppressChartRanges: boolean;
    public readonly aggFunc?: string | IAggFunc;
    public readonly pivotChart: boolean;
    public chartType: ChartType;
    public chartThemeName: string;
    public unlinked = false;
    public chartData: any[] = [];
    public seriesChartTypes: SeriesChartType[];
    public valueColState: ColState[] = [];
    public dimensionColState: ColState[] = [];
    public columnNames: { [p: string]: string[]; } = {};

    public valueCellRange?: CellRange;
    public dimensionCellRange?: CellRange;

    private referenceCellRange: CellRange;
    private suppliedCellRange: CellRange;

    private datasource: ChartDatasource;

    private grouping = false;
    private crossFiltering = false;

    public constructor(params: ChartModelParams) {
        super();

        this.chartId = params.chartId;
        this.pivotChart = params.pivotChart;
        this.chartType = params.chartType;
        this.chartThemeName = params.chartThemeName;
        this.aggFunc = params.aggFunc;
        this.referenceCellRange = params.cellRange;
        this.suppliedCellRange = params.cellRange;
        this.suppressChartRanges = params.suppressChartRanges;
        this.unlinked = !!params.unlinkChart;
        this.crossFiltering = !!params.crossFiltering;
        this.seriesChartTypes = params.seriesChartTypes || [];
    }

    @PostConstruct
    private init(): void {
        this.datasource = this.createManagedBean(new ChartDatasource());
        this.updateCellRanges();
        this.updateSeriesChartTypes();
    }

    public updateCellRanges(updatedColState?: ColState): void {
        if (this.valueCellRange) {
            this.referenceCellRange = this.valueCellRange;
        }

        const { dimensionCols, valueCols } = this.getAllChartColumns();
        const allColsFromRanges = this.getAllColumnsFromRanges();

        if (updatedColState) {
            this.updateColumnState(updatedColState);
        }

        this.setDimensionCellRange(dimensionCols, allColsFromRanges, updatedColState);
        this.setValueCellRange(valueCols, allColsFromRanges, updatedColState);

        if (!updatedColState) {
            this.resetColumnState();
            // dimension / category cell range could be out of sync after resetting column state when row grouping
            this.syncDimensionCellRange();
        }

        this.updateData();
    }

    public updateData(): void {
        const { startRow, endRow } = this.getRowIndexes();

        if (this.pivotChart) {
            this.resetColumnState();
        }

        this.grouping = this.isGrouping();

        const params: ChartDatasourceParams = {
            aggFunc: this.aggFunc,
            dimensionCols: [this.getSelectedDimension()],
            grouping: this.grouping,
            pivoting: this.isPivotActive(),
            crossFiltering: this.crossFiltering,
            valueCols: this.getSelectedValueCols(),
            startRow,
            endRow,
            isScatter: _.includes(['scatter', 'bubble'], this.chartType)
        };

        const { chartData, columnNames } = this.datasource.getData(params);

        this.chartData = chartData;
        this.columnNames = columnNames;
    }

    public isGrouping(): boolean {
        const usingTreeData = this.gridOptionsWrapper.isTreeData();
        const groupedCols = usingTreeData ? null : this.columnModel.getRowGroupColumns();
        const isGroupActive = usingTreeData || (groupedCols && groupedCols.length > 0);

        // charts only group when the selected category is a group column
        const colId = this.getSelectedDimension().colId;
        const displayedGroupCols = this.columnModel.getGroupDisplayColumns();
        const groupDimensionSelected = displayedGroupCols.map(col => col.getColId()).some(id => id === colId);
        return !!isGroupActive && groupDimensionSelected;
    }

    public getSelectedValueCols(): Column[] {
        return this.valueColState.filter(cs => cs.selected).map(cs => cs.column!);
    }

    public getSelectedDimension(): ColState {
        return this.dimensionColState.filter(cs => cs.selected)[0];
    }

    public getColDisplayName(col: Column): string | null {
        return this.columnModel.getDisplayNameForColumn(col, 'chart');
    }

    public isPivotMode(): boolean {
        return this.columnModel.isPivotMode();
    }

    private isPivotActive(): boolean {
        return this.columnModel.isPivotActive();
    }

    private createCellRange(type: CellRangeType, ...columns: Column[]): CellRange {
        return {
            id: this.chartId, // set range ID to match chart ID so we can identify changes to the ranges for this chart
            startRow: this.referenceCellRange.startRow,
            endRow: this.referenceCellRange.endRow,
            columns,
            startColumn: type === CellRangeType.DIMENSION ? columns[0] : this.referenceCellRange.startColumn,
            type
        };
    }

    private getAllColumnsFromRanges(): Set<Column> {
        if (this.pivotChart) {
            return _.convertToSet(this.columnModel.getAllDisplayedColumns());
        }

        const columns = this.dimensionCellRange || this.valueCellRange ? [] : this.referenceCellRange.columns;

        if (this.dimensionCellRange) {
            columns.push(...this.dimensionCellRange.columns);
        }

        if (this.valueCellRange) {
            columns.push(...this.valueCellRange.columns);
        }

        return _.convertToSet(columns);
    }

    private getRowIndexes(): { startRow: number; endRow: number; } {
        let startRow = 0, endRow = 0;
        const { rangeService } = this;
        const { valueCellRange: range } = this;

        if (rangeService && range) {
            startRow = rangeService.getRangeStartRow(range).rowIndex;

            // when the last row the cell range is a pinned 'bottom' row, the `endRow` index is set to -1 which results
            // in the ChartDatasource processing all non pinned rows from the `startRow` index.
            const endRowPosition = rangeService.getRangeEndRow(range);
            endRow = endRowPosition.rowPinned === Constants.PINNED_BOTTOM ? -1 : endRowPosition.rowIndex;
        }

        return { startRow, endRow };
    }

    private getAllChartColumns(): { dimensionCols: Set<Column>; valueCols: Set<Column>; } {
        const displayedCols = this.columnModel.getAllDisplayedColumns();

        const dimensionCols = new Set<Column>();
        const valueCols = new Set<Column>();

        displayedCols.forEach(col => {
            const colDef = col.getColDef();
            const chartDataType = colDef.chartDataType;

            if (chartDataType) {
                // chart data type was specified explicitly
                switch (chartDataType) {
                    case 'category':
                    case 'time':
                        dimensionCols.add(col);
                        return;
                    case 'series':
                        valueCols.add(col);
                        return;
                    case 'excluded':
                        return;
                    default:
                        console.warn(`AG Grid: unexpected chartDataType value '${chartDataType}' supplied, instead use 'category', 'series' or 'excluded'`);
                        break;
                }
            }

            if (colDef.colId === 'ag-Grid-AutoColumn') {
                dimensionCols.add(col);
                return;
            }

            if (!col.isPrimary()) {
                valueCols.add(col);
                return;
            }

            // if 'chartDataType' is not provided then infer type based data contained in first row
            (this.isNumberCol(col) ? valueCols : dimensionCols).add(col);
        });

        return { dimensionCols, valueCols };
    }

    private isNumberCol(col: Column): boolean {
        if (col.getColId() === 'ag-Grid-AutoColumn') {
            return false;
        }

        const row = this.rowRenderer.getRowNode({ rowIndex: 0, rowPinned: null });

        if (!row) { return false; }

        let cellValue = this.valueService.getValue(col, row);

        if (cellValue == null) {
            cellValue = this.extractLeafData(row, col);
        }

        if (cellValue != null && typeof cellValue.toNumber === 'function') {
            cellValue = cellValue.toNumber();
        }

        return typeof cellValue === 'number';
    }

    private extractLeafData(row: RowNode, col: Column): any {
        if (!row.allLeafChildren) { return null; }

        for (let i = 0; i < row.allLeafChildren.length; i++) {
            const childRow = row.allLeafChildren[i];
            const value = this.valueService.getValue(col, childRow);

            if (value != null) {
                return value;
            }
        }

        return null;
    }

    private resetColumnState(): void {
        const { dimensionCols, valueCols } = this.getAllChartColumns();
        const allCols = this.getAllColumnsFromRanges();
        const isInitialising = this.valueColState.length < 1;

        this.dimensionColState = [];
        this.valueColState = [];

        let hasSelectedDimension = false;
        let order = 1;

        const aggFuncDimension = this.suppliedCellRange.columns[0]; //TODO

        dimensionCols.forEach(column => {
            const isAutoGroupCol = column.getColId() === 'ag-Grid-AutoColumn';

            let selected = false;
            if (this.crossFiltering && this.aggFunc) {
                if (aggFuncDimension.getColId() === column.getColId()) {
                    selected = true;
                }
            } else {
                selected = isAutoGroupCol ? true : !hasSelectedDimension && allCols.has(column);
            }

            this.dimensionColState.push({
                column,
                colId: column.getColId(),
                displayName: this.getColDisplayName(column),
                selected,
                order: order++
            });

            if (selected) {
                hasSelectedDimension = true;
            }
        });

        const defaultCategory = {
            colId: ChartDataModel.DEFAULT_CATEGORY,
            displayName: this.chartTranslator.translate('defaultCategory'),
            selected: !hasSelectedDimension, // if no dimensions in range select the default
            order: 0
        };

        this.dimensionColState.unshift(defaultCategory);

        const valueColumnsFromReferenceRange = this.referenceCellRange.columns.filter(c => valueCols.has(c));

        valueCols.forEach(column => {
            // first time the value cell range is set, preserve the column order from the supplied range
            if (isInitialising && _.includes(this.referenceCellRange.columns, column)) {
                column = valueColumnsFromReferenceRange.shift()!;
            }

            this.valueColState.push({
                column,
                colId: column.getColId(),
                displayName: this.getColDisplayName(column),
                selected: allCols.has(column),
                order: order++
            });
        });
    }

    private updateColumnState(updatedCol: ColState): void {
        const idsMatch = (cs: ColState) => cs.colId === updatedCol.colId;
        const { dimensionColState, valueColState } = this;

        if (dimensionColState.filter(idsMatch).length > 0) {
            // only one dimension should be selected
            dimensionColState.forEach(cs => cs.selected = idsMatch(cs));
        } else {
            // just update the selected value on the supplied value column
            valueColState.filter(idsMatch).forEach(cs => cs.selected = updatedCol.selected);
        }

        const allColumns = [...dimensionColState, ...valueColState];
        const orderedColIds: string[] = [];

        // calculate new order
        allColumns.forEach((col: ColState, i: number) => {
            if (i === updatedCol.order) {
                orderedColIds.push(updatedCol.colId);
            }

            if (col.colId !== updatedCol.colId) {
                orderedColIds.push(col.colId);
            }
        });

        // update col state with new order
        allColumns.forEach(col => {
            const order = orderedColIds.indexOf(col.colId);
            col.order = order >= 0 ? orderedColIds.indexOf(col.colId) : allColumns.length - 1;
        });

        this.reorderColState();
        this.updateSeriesChartTypes();
    }

    private reorderColState(): void {
        const ascColStateOrder = (a: ColState, b: ColState) => a.order - b.order;
        this.dimensionColState.sort(ascColStateOrder);
        this.valueColState.sort(ascColStateOrder);
    }

    private updateSeriesChartTypes() {
        const { valueColState } = this;

        if (this.seriesChartTypes.length === 0) { //TODO




            this.seriesChartTypes = valueColState.map(valueCol => {
                return { colId: valueCol.colId, chartType: 'groupedColumn', secondaryAxis: false };
            });
        }
    }

    private setDimensionCellRange(dimensionCols: Set<Column>, colsInRange: Set<Column>, updatedColState?: ColState): void {
        this.dimensionCellRange = undefined;

        if (!updatedColState && !this.dimensionColState.length) {
            // use first dimension column in range by default
            dimensionCols.forEach(col => {
                if (this.dimensionCellRange || !colsInRange.has(col)) { return; }
                this.dimensionCellRange = this.createCellRange(CellRangeType.DIMENSION, col);
            });
            return;
        }

        let selectedDimensionColState = updatedColState;
        if (this.crossFiltering && this.aggFunc) {
            const aggFuncDimension = this.suppliedCellRange.columns[0]; //TODO
            selectedDimensionColState = this.dimensionColState.filter(cs => cs.colId === aggFuncDimension.getColId())[0];
        } else if (!selectedDimensionColState || !dimensionCols.has(selectedDimensionColState.column!)) {
            selectedDimensionColState = this.dimensionColState.filter(cs => cs.selected)[0];
        }

        if (selectedDimensionColState && selectedDimensionColState.colId !== ChartDataModel.DEFAULT_CATEGORY) {
            this.dimensionCellRange = this.createCellRange(CellRangeType.DIMENSION, selectedDimensionColState.column!);
        }
    }

    private setValueCellRange(valueCols: Set<Column>, colsInRange: Set<Column>, updatedColState?: ColState): void {
        this.valueCellRange = undefined;

        const selectedValueCols: Column[] = [];

        valueCols.forEach(col => {
            if (updatedColState && updatedColState.colId === col.getColId()) {
                if (updatedColState.selected) {
                    selectedValueCols.push(updatedColState.column!);
                }
            } else if (colsInRange.has(col)) {
                selectedValueCols.push(col);
            }
        });

        if (selectedValueCols.length > 0) {
            let orderedColIds: string[] = [];

            if (this.valueColState.length > 0) {
                orderedColIds = this.valueColState.map(c => c.colId);
            } else {
                colsInRange.forEach(c => orderedColIds.push(c.getColId()));
            }

            selectedValueCols.sort((a, b) => orderedColIds.indexOf(a.getColId()) - orderedColIds.indexOf(b.getColId()));

            this.valueCellRange = this.createCellRange(CellRangeType.VALUE, ...selectedValueCols);
        }
    }

    private syncDimensionCellRange() {
        const selectedDimension = this.getSelectedDimension();
        if (selectedDimension && selectedDimension.column) {
            this.dimensionCellRange = this.createCellRange(CellRangeType.DIMENSION, selectedDimension.column);
        }
    }
}
