import { MiniChartWithAxes } from "../miniChartWithAxes";
import { Path, Rect } from "ag-charts-community";
import { ChartType } from "@ag-grid-community/core";
import { createColumnRects, CreateColumnRectsParams, createLinePaths } from "../miniChartHelpers";

export class MiniGroupedColumnLine extends MiniChartWithAxes {

    static chartType: ChartType = 'groupedColumnLine';

    private columns: Rect[];
    private lines: Path[];

    private columnData = [3, 4];

    private lineData = [
        [5, 4, 6, 5, 4]
    ];

    constructor(container: HTMLElement, fills: string[], strokes: string[]) {
        super(container, "groupedColumnLineTooltip");

        const { root, columnData, lineData, size, padding } = this;

        this.columns = createColumnRects({
            stacked: false,
            root,
            data: columnData,
            size,
            padding,
            xScaleDomain: [0, 1],
            yScaleDomain: [0, 4],
            xScalePadding: 0.5
        } as CreateColumnRectsParams);

        root.append(this.columns);

        this.lines = createLinePaths(root, lineData, size, padding);

        this.updateColors(fills, strokes);
    }

    updateColors(fills: string[], strokes: string[]) {
        this.columns.forEach((bar: Rect, i: number) => {
            bar.fill = fills[i];
            bar.stroke = strokes[i];
        });

        this.lines.forEach((line: Path, i: number) => {
            line.stroke = fills[i+2];
        });
    }
}
