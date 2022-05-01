export type PresetColorPalette = { caption: string, colors: string[] };
export type SelectColorCellCallback = (color_index: number) => void;
export type DragAndDropColorCellCallback = (
	src_color_index: number, src_color_cell: HTMLTableDataCellElement,
	dst_color_index: number, dst_color_cell: HTMLTableDataCellElement,
) => void;
export type ChangeColorCallback = (color_index: number, color_string: string) => void;
export class ColorPaletteTableUi {
	/* for color table UI */
	private dummy_canvas_array_: HTMLCanvasElement[];
	private color_cells_: HTMLTableDataCellElement[];
	private tr_array_: HTMLTableRowElement[];
	private table_: HTMLTableElement;

	/* for preset color palette UI */
	private preset_palette_selector_: HTMLSelectElement;
	private reset_color_palette_button_: HTMLButtonElement;

	/* for color edit UI */
	private color_input_: HTMLInputElement;
	private color_caption_: HTMLDivElement;

	/* layout */
	private preset_command_holder_: HTMLDivElement;
	private color_table_holder_: HTMLDivElement;
	private color_edit_holder_: HTMLDivElement;
	private holder_: HTMLDivElement;

	private selected_index_: number;
	private preset_color_palettes_: PresetColorPalette[];

	private static SetUnselectedColorCellStyle(color_cell: HTMLTableDataCellElement) {
		color_cell.style.borderColor = "#000000";
	}
	private static SetSelectedColorCellStyle(color_cell: HTMLTableDataCellElement) {
		color_cell.style.borderColor = "#00ff00";
	}
	private static RgbStringToHexColor(rgb_string: string) {
		const [r_string, g_string, b_string] = rgb_string.split('(')[1].split(')')[0].split(',');
		const r_hex = ('00' + Number(r_string).toString(16)).slice(-2);
		const g_hex = ('00' + Number(g_string).toString(16)).slice(-2);
		const b_hex = ('00' + Number(b_string).toString(16)).slice(-2);
		return `#${r_hex}${g_hex}${b_hex}`;
	}

	private UpdateColorEditCaption() {
		const i = this.selected_index_;
		const color = ColorPaletteTableUi.RgbStringToHexColor(this.color_cells_[i].style.backgroundColor);
		this.color_caption_.innerText = `${i}:${color}`
	}
	private UpdateColorEditView() {
		const i = this.selected_index_;
		const color = ColorPaletteTableUi.RgbStringToHexColor(this.color_cells_[i].style.backgroundColor);
		this.color_input_.value = color;
		this.color_caption_.innerText = `${i}:${color}`
	}
	constructor(
		num_cols: 16, cell_width: number, cell_height: number,
		initial_color_palette_index: number,
		preset_color_palettes: PresetColorPalette[],
		select_color_callback: SelectColorCellCallback,
		dad_color_cell_callback: DragAndDropColorCellCallback,
		change_color_callback: ChangeColorCallback) {
		this.selected_index_ = 0;
		this.preset_color_palettes_ = preset_color_palettes;

		/* for color table UI */
		this.dummy_canvas_array_ = new Array<HTMLCanvasElement>(256);
		for (let i = 0; i < 256; i++) {
			const dummy_canvas = document.createElement("canvas");
			dummy_canvas.width = cell_width - 2;
			dummy_canvas.height = cell_height - 2;
			this.dummy_canvas_array_[i] = dummy_canvas;
		}
		this.color_cells_ = new Array<HTMLTableDataCellElement>(256);
		const initiali_color_palette = preset_color_palettes[initial_color_palette_index].colors;
		for (let i = 0; i < 256; i++) {
			const color_cell = document.createElement("td");
			color_cell.draggable = true;
			color_cell.style.backgroundColor = initiali_color_palette[i];
			color_cell.style.borderStyle = "solid";
			color_cell.style.borderWidth = "1px";
			color_cell.style.lineHeight = "1px";
			color_cell.appendChild(this.dummy_canvas_array_[i]);
			ColorPaletteTableUi.SetUnselectedColorCellStyle(color_cell);
			this.color_cells_[i] = color_cell;
		}
		ColorPaletteTableUi.SetSelectedColorCellStyle(this.color_cells_[this.selected_index_]);
		this.tr_array_ = new Array<HTMLTableRowElement>(16);
		for (let i = 0; i < 16; i++) {
			const tr = document.createElement("tr");
			for (let j = 0; j < 16; j++) {
				const td_index = 16 * i + j;
				tr.appendChild(this.color_cells_[td_index]);
			}
			this.tr_array_[i] = tr;
		}
		this.table_ = document.createElement("table");
		this.table_.style.borderSpacing = "0";
		for (let i = 0; i < 16; i++) {
			this.table_.appendChild(this.tr_array_[i]);
		}

		for (let i = 0; i < 256; i++) {
			this.color_cells_[i].addEventListener('click', () => {
				select_color_callback(i);
				ColorPaletteTableUi.SetUnselectedColorCellStyle(this.color_cells_[this.selected_index_]);
				ColorPaletteTableUi.SetSelectedColorCellStyle(this.color_cells_[i]);
				this.selected_index_ = i;
				this.UpdateColorEditView();
			});
			this.color_cells_[i].addEventListener('dragstart', (event) => {
				event.dataTransfer.setData("color_index", i.toString());
			});
			this.color_cells_[i].addEventListener('dragover', (event) => {
				event.preventDefault();
			});
			this.color_cells_[i].addEventListener('drop', (event) => {
				event.preventDefault();
				const drag_color_index = parseInt(event.dataTransfer.getData("color_index"));
				dad_color_cell_callback(
					drag_color_index, this.color_cells_[drag_color_index],
					i, this.color_cells_[i]);
				const tmp_color = this.color_cells_[drag_color_index].style.backgroundColor;
				this.color_cells_[drag_color_index].style.backgroundColor = this.color_cells_[i].style.backgroundColor;
				this.color_cells_[i].style.backgroundColor = tmp_color;
			});
		}

		/* for preset color palette UI */
		this.preset_palette_selector_ = document.createElement("select");
		const none_option = document.createElement("option");
		none_option.value = "0";
		none_option.innerText = "変更しない";
		this.preset_palette_selector_.append(none_option);
		for (let i = 0; i < preset_color_palettes.length; i++) {
			const preset_option = document.createElement("option");
			preset_option.value = (i + 1).toString();
			preset_option.innerText = preset_color_palettes[i].caption;
			this.preset_palette_selector_.append(preset_option);
		}
		this.preset_palette_selector_.selectedIndex = 0;

		this.reset_color_palette_button_ = document.createElement("button");
		this.reset_color_palette_button_.innerText = "リセット";
		this.reset_color_palette_button_.addEventListener('click', (event) => {
			const preset_command_index = parseInt(this.preset_palette_selector_.value);
			if (preset_command_index === 0) {
				return;
			}
			const preset_index = preset_command_index - 1;
			const preset_color_palette = this.preset_color_palettes_[preset_index].colors;
			for (let i = 0; i < 256; i++) {
				const color_cell = this.color_cells_[i];
				const color_string = preset_color_palette[i];
				color_cell.style.backgroundColor = color_string;
				change_color_callback(i, color_string);
			}
			this.UpdateColorEditView();
			this.preset_palette_selector_.value = "0";
		});

		/* for color edit UI */
		this.color_input_ = document.createElement("input");
		this.color_caption_ = document.createElement("div");
		this.color_caption_.style.float = "right";
		this.UpdateColorEditView();
		this.color_input_.type = "color";
		this.color_input_.addEventListener('input', (event) => {
			const i = this.selected_index_;
			const new_color_string = (<HTMLInputElement>event.target).value;
			this.color_cells_[i].style.backgroundColor = new_color_string;
			this.UpdateColorEditCaption();
			change_color_callback(i, new_color_string);
		});

		this.preset_command_holder_ = document.createElement("div");
		this.color_table_holder_ = document.createElement("div");
		this.color_edit_holder_ = document.createElement("div");
		this.holder_ = document.createElement("div");
		this.preset_command_holder_.style.clear = "both";
		this.color_table_holder_.style.clear = "both";
		this.color_edit_holder_.style.clear = "both";
		this.holder_.style.clear = "both";
		this.holder_.style.width = "min-content";

		this.preset_command_holder_.appendChild(this.preset_palette_selector_);
		this.preset_command_holder_.appendChild(this.reset_color_palette_button_);
		this.color_table_holder_.appendChild(this.table_);
		this.color_edit_holder_.appendChild(this.color_input_);
		this.color_edit_holder_.appendChild(this.color_caption_);
		this.holder_.appendChild(this.preset_command_holder_);
		this.holder_.appendChild(this.color_table_holder_);
		this.holder_.appendChild(this.color_edit_holder_);
		return;
	}
	public get node(): HTMLDivElement {
		return this.holder_;
	}
	public GetColor(index: number) {
		return this.color_cells_[index].style.backgroundColor;
	}
	public GetColorTable(): string[] {
		const color_table = new Array<string>(256);
		for (let i = 0; i < 256; i++) {
			color_table[i] = this.color_cells_[i].style.backgroundColor;
		}
		return color_table;
	}
	public SetColor(index: number, color_string: string): void {
		this.color_cells_[index].style.backgroundColor = color_string;
		if (this.selected_index_ === index) {
			this.UpdateColorEditView();
		}
	}
	public SetColorTable(color_table: string[]) {
		for (let i = 0; i < 256; i++) {
			this.color_cells_[i].style.backgroundColor = color_table[i];
		}
		this.UpdateColorEditView();
	}

	public SelectColorCell(color_index: number): void {
		ColorPaletteTableUi.SetUnselectedColorCellStyle(this.color_cells_[this.selected_index_]);
		ColorPaletteTableUi.SetSelectedColorCellStyle(this.color_cells_[color_index]);
		this.selected_index_ = color_index;
		this.UpdateColorEditView();
	}
}
