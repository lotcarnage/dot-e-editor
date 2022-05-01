function CreatePanel(name: string, title: string, base64icon: string, size: number): [HTMLInputElement, HTMLLabelElement, HTMLImageElement] {
    const tool_id = `tool_panel_${name}`;
    const input_radio = document.createElement("input");
    input_radio.type = "radio";
    input_radio.id = tool_id;
    input_radio.name = "tool panels";
    input_radio.style.display = `none`;
    const input_label = document.createElement("label");
    input_label.htmlFor = tool_id;
    input_label.style.margin = `0px`;
    input_label.style.padding = `0px`;
    input_label.style.alignContent = `center`;
    input_label.style.lineHeight = `1px`;
    const icon = document.createElement("img");
    icon.width = size;
    icon.height = size;
    icon.style.imageRendering = `crisp-edges`;
    icon.src = base64icon;
    icon.title = title;
    icon.style.outlineOffset = '-2px'
    input_label.appendChild(icon);
    return [input_radio, input_label, icon]
}

export class ToolBoxUi<ToolKind extends string> {
    private holder_: HTMLDivElement;
    private current_icon_: HTMLImageElement;
    private current_kind_: ToolKind;
    private static readonly outline_style_ = `2px solid rgb(255,0,0)`;

    constructor(tool_list: { kind: ToolKind, title: string, base64icon: string }[], SelectCallback: (released_tool_kind: ToolKind, selected_tool_kind: ToolKind) => void) {
        this.holder_ = document.createElement("div");
        for (let i = 0; i < tool_list.length; i++) {
            const [input_radio, input_label, icon] = CreatePanel(tool_list[i].kind, tool_list[i].title, tool_list[i].base64icon, 32);
            if (i == 0) {
                icon.style.outline = ToolBoxUi.outline_style_;
                this.current_icon_ = icon;
                this.current_kind_ = tool_list[0].kind;
            }
            input_radio.addEventListener("change", (event) => {
                SelectCallback(this.current_kind_, tool_list[i].kind);
                this.current_icon_.style.outline = 'none';
                icon.style.outline = ToolBoxUi.outline_style_;
                this.current_icon_ = icon;
                this.current_kind_ = tool_list[i].kind;
            });
            this.holder_.appendChild(input_radio);
            this.holder_.appendChild(input_label);
        }
    }
    public get node(): HTMLDivElement {
        return this.holder_;
    }
}