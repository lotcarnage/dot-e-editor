export namespace Dom {
    export function CreateSelector<ItemType extends { toString(): string; }>(
        items: ItemType[], ToCaptionCallback: (index: number, item: ItemType) => string, selected_index: number): HTMLSelectElement {
        const selector = document.createElement("select");
        for (let i = 0; i < items.length; i++) {
            const preset_option = document.createElement("option");
            preset_option.value = items[i].toString();
            preset_option.innerText = ToCaptionCallback(i, items[i]);
            selector.append(preset_option);
        }
        selector.selectedIndex = selected_index;
        return selector;
    }

};