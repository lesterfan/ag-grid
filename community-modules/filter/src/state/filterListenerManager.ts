export class FilterListenerManager<F extends (...args: any[]) => any> {
    private readonly listeners: [any, F][] = [];

    public addListener(source: any, cb: F): void {
        this.listeners.push([source, cb]);
    }

    public removeListener(cb: F): void {
        this.listeners.splice(this.listeners.findIndex(([_, c]) => c === cb), 1);
    }

    public notify(source: any, ...args: Parameters<F>): void {
        this.listeners.forEach(([s, l]) => {
            if (s === source) { return; }
            l(...args);
        });
    }
}
