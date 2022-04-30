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

    export function CreateText(text: string): HTMLSpanElement {
        const span = document.createElement("span");
        span.innerText = text;
        return span;
    }

    export function CreateButton(caption: string, ClickEventCallback: (element: HTMLButtonElement) => void): HTMLButtonElement {
        const button = document.createElement("button");
        button.innerText = caption;
        button.addEventListener('click', (event) => {
            const buttonElement = (<HTMLButtonElement>event.target);
            ClickEventCallback(buttonElement);
            return;
        });
        return button;
    }

    export function CreateCheckBox(checkbox_id: string, label_content: HTMLElement): [HTMLInputElement, HTMLLabelElement] {
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = checkbox_id;
        const label = document.createElement("label");
        label.htmlFor = checkbox.id;
        label.appendChild(label_content);
        return [checkbox, label];
    }

    export function CreateNumberInput(minimum: number, maximum: number, value: number): HTMLInputElement {
        const element = document.createElement("input");
        element.type = "number";
        element.min = minimum.toString();
        element.max = maximum.toString();
        element.value = value.toString();
        return element;
    }

};