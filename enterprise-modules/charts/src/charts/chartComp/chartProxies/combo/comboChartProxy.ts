import { AgChart, CartesianChart, ChartAxisPosition } from "ag-charts-community";
import { ChartType, SeriesChartType } from "@ag-grid-community/core";
import { ChartProxyParams, FieldDefinition, UpdateChartParams } from "../chartProxy";
import { CartesianChartProxy } from "../cartesian/cartesianChartProxy";
import { deepMerge } from "../../object";
import { getChartThemeOverridesObjectName } from "../../chartThemeOverridesMapper";

export class ComboChartProxy extends CartesianChartProxy {

    public constructor(params: ChartProxyParams) {
        super(params);

        this.xAxisType = params.grouping ? 'groupedCategory' : 'category';
        this.yAxisType = 'number';

        this.recreateChart();
    }

    protected createChart(): CartesianChart {
        return AgChart.create({
            container: this.chartProxyParams.parentElement,
            theme: this.chartTheme,
            axes: this.getAxes()
        });
    }

    public update(params: UpdateChartParams): void {
        // this.updateAxes(params);

        const options = {
            container: this.chartProxyParams.parentElement,
            theme: this.chartTheme,
            axes: this.getAxes(),
            data: this.transformData(params.data, params.category.id),
            series: this.getSeriesOptions(params)
        }

        AgChart.update(this.chart as CartesianChart, options);

        this.updateLabelRotation(params.category.id);
    }

    private getSeriesOptions(params: UpdateChartParams): any {
        return params.fields.map(field => {
            const seriesChartType = params.seriesChartTypes.find(s => s.colId === field.colId);
            if (seriesChartType) {
                const chartType: ChartType = seriesChartType.chartType;
                return {
                    type: getChartThemeOverridesObjectName(chartType),
                    xKey: params.category.id,
                    yKey: field.colId,
                    yName: field.displayName,
                    grouped: chartType === 'groupedColumn' || 'groupedBar',
                }
            }
        });
    }

    private getAxes() {
        const axisOptions = this.getAxesOptions();
        return [
            {
                ...deepMerge(axisOptions[this.xAxisType], axisOptions[this.xAxisType].bottom),
                type: this.xAxisType,
                position: ChartAxisPosition.Bottom
            },
            {
                ...deepMerge(axisOptions[this.yAxisType], axisOptions[this.yAxisType].left),
                type: this.yAxisType,
                position: ChartAxisPosition.Left
            },
        ];
    }
}