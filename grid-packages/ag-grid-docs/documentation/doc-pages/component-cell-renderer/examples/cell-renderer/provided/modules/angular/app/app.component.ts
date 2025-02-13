import {Component} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {AllCommunityModules, GridApi, Module, RowNode} from '@ag-grid-community/all-modules';
import '@ag-grid-community/all-modules/dist/styles/ag-grid.css';
import "@ag-grid-community/all-modules/dist/styles/ag-theme-alpine.css";
import {DaysFrostRenderer} from './days-frost-renderer.component';
import { threadId } from 'worker_threads';

/*
* It's unlikely you'll use functions that create and manipulate DOM elements like this in an Angular application, but it
* demonstrates what is at least possible, and may be preferable in certain use cases
*/
const createImageSpan = (imageMultiplier: number, image: string) => {
    const resultElement = document.createElement('span');
    for (let i = 0; i < imageMultiplier; i++) {
        const imageElement = document.createElement('img');
        imageElement.src = 'https://www.ag-grid.com/example-assets/weather/' + image;
        resultElement.appendChild(imageElement);
    }
    return resultElement;
};

// This is a plain JS (not Angular) component
class DeltaIndicator {
    private eGui;
    init(params) {
        const element = document.createElement('span');
        const imageElement = document.createElement('img');
        if (params.value > 15) {
            imageElement.src = 'https://www.ag-grid.com/example-assets/weather/fire-plus.png';
        } else {
            imageElement.src = 'https://www.ag-grid.com/example-assets/weather/fire-minus.png';
        }
        element.appendChild(imageElement);
        element.appendChild(document.createTextNode(params.value));
        this.eGui = element;
    }
    getGui() {
        return this.eGui;
    }
}

// This is a plain JS (not Angular) component
class DaysSunshineRenderer {
    private eGui;
    init(params) {
        const daysSunshine = params.value / 24;
        this.eGui = createImageSpan(daysSunshine, params.rendererImage);    
    }
    getGui() {
        return this.eGui;        
    }
}

// This is a plain JS (not Angular) component
class RainPerTenMmRenderer {
    private eGui;
    init(params: any) {
        const rainPerTenMm = params.value / 10;
        this.eGui = createImageSpan(rainPerTenMm, params.rendererImage);
    }
    getGui() {
        return this.eGui;        
    }
}

@Component({
    selector: 'my-app',
    template: `
        <div class="example-wrapper">
        <div style="margin-bottom: 5px;">
            <input type="button" value="Frostier Year" (click)="frostierYear()">
        </div>
        <ag-grid-angular
                #agGrid
                style="width: 100%; height: 100%;"
                class="ag-theme-alpine"
                [modules]="modules"
                [columnDefs]="columnDefs"
                [defaultColDef]="defaultColDef"
                (gridReady)="onGridReady($event)"
        ></ag-grid-angular>
        </div>
    `
})

export class AppComponent {

    private gridApi: GridApi;

    public modules: Module[] = AllCommunityModules;

    private columnDefs = [
        {
            headerName: "Month",
            field: "Month",
            width: 75,
            cellStyle: {color: "darkred"}
        },
        {
            headerName: "Max Temp (\u02DAC)",
            field: "Max temp (C)",
            width: 120,
            cellRendererComp: DeltaIndicator
        },
        {
            headerName: "Min Temp (\u02DAC)",
            field: "Min temp (C)",
            width: 120,
            cellRendererComp: DeltaIndicator
        },
        {
            headerName: "Days of Air Frost",
            field: "Days of air frost (days)",
            width: 233,
            cellRendererComp: DaysFrostRenderer,
            cellRendererCompParams: {rendererImage: "frost.png"}
        },
        {
            headerName: "Days Sunshine",
            field: "Sunshine (hours)",
            width: 190,
            cellRendererComp: DaysSunshineRenderer,
            cellRendererCompParams: {rendererImage: "sun.png"}
        },
        {
            headerName: "Rainfall (10mm)",
            field: "Rainfall (mm)",
            width: 180,
            cellRendererComp: DaysSunshineRenderer,
            cellRendererCompParams: {rendererImage: "rain.png"}
        }
    ];

    private defaultColDef: {
        editable: true,
        sortable: true,
        flex: 1,
        minWidth: 100,
        filter: true,
        resizable: true
    };

    constructor(private http: HttpClient) {
    }

    /**
     * Updates the Days of Air Frost column - adjusts the value which in turn will demonstrate the Component refresh functionality
     * After a data update, cellRenderer Components.refresh method will be called to re-render the altered Cells
     */
    frostierYear() {
        const extraDaysFrost = Math.floor(Math.random() * 2) + 1;

        // iterate over the rows and make each "days of air frost"
        this.gridApi.forEachNode((rowNode: RowNode) => {
            rowNode.setDataValue('Days of air frost (days)', rowNode.data['Days of air frost (days)'] + extraDaysFrost);
        });
    }

    onGridReady(params: any) {
        this.gridApi = params.api;

        this.http.get('https://www.ag-grid.com/example-assets/weather-se-england.json').subscribe(data => params.api.setRowData(data));
    }
}


