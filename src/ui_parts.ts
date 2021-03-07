namespace UiParts {
	type SwapCallback = (lh_order: number, rh_order: number) => void;
	export type RegisterUserValueCallback<UserType> = (registration_order: number) => [string, string, UserType];
	export type RemovedCallback<UserType> = (target: UserType, order: number) => void;
	export type UpdatedStateCallback<UserType> = (
		target: UserType, order: number, name: string, tag_color: string,
		is_locked: boolean, is_visible: boolean,
		is_focusin: boolean, is_focusout: boolean,
		thumbnail_context: CanvasRenderingContext2D) => void;
	export type DrawThumbnailCallback<UserType> = (
		target: UserType, order: number, is_locked: boolean, is_visible: boolean, thumbnail_context: CanvasRenderingContext2D) => void;

	export class LayerUi<UserType> {
		private parent_: HTMLElement;
		private layer_frame_: HTMLDivElement;
		private tab_: HTMLDivElement;
		private thumbnail_: HTMLCanvasElement;
		private layer_lock_checkbox_: HTMLInputElement;
		private layer_view_checkbox_: HTMLInputElement;
		private layer_name_: HTMLInputElement;
		private order_: number;
		private user_value_: UserType;
		private update_state_callback_: UpdatedStateCallback<UserType>;
		constructor(parent: HTMLElement, order: number, name: string, color: string, user_value: UserType) {
			this.parent_ = parent;
			this.user_value_ = user_value;
			this.layer_frame_ = document.createElement("div");
			this.layer_frame_.style.display = "flex";
			this.layer_frame_.style.alignItems = "center";
			this.tab_ = document.createElement("div");
			this.tab_.style.width = (40).toString();
			this.tab_.style.height = (32).toString();
			this.tab_.style.backgroundColor = color;
			this.tab_.style.display = "flex";
			this.tab_.style.justifyContent = "center";
			this.tab_.style.alignItems = "center";
			this.thumbnail_ = document.createElement("canvas");
			this.layer_lock_checkbox_ = document.createElement("input");
			this.layer_view_checkbox_ = document.createElement("input");
			this.layer_name_ = document.createElement("input");
			this.thumbnail_.width = 16;
			this.thumbnail_.height = 16;
			this.layer_lock_checkbox_.type = "checkbox";
			this.layer_lock_checkbox_.checked = false;
			this.layer_view_checkbox_.type = "checkbox";
			this.layer_view_checkbox_.checked = true;
			this.layer_name_.type = "text";
			this.layer_name_.value = name;
			this.layer_name_.style.height = '1em';
			this.layer_name_.style.paddingTop = (8).toString();
			this.layer_name_.style.paddingBottom = (8).toString();
			this.tab_.appendChild(this.thumbnail_);
			this.layer_frame_.appendChild(this.tab_);
			this.layer_frame_.appendChild(this.layer_lock_checkbox_);
			this.layer_frame_.appendChild(this.layer_view_checkbox_);
			this.layer_frame_.appendChild(this.layer_name_);
			this.order_ = order;
			this.layer_frame_.style.order = this.order_.toString();
			this.layer_frame_.tabIndex = 0;
			this.layer_frame_.style.backgroundColor = "rgb(255,255,255)";
			this.parent_.appendChild(this.layer_frame_);
		}
		public Destruct(): UserType {
			this.parent_.removeChild(this.layer_frame_);
			return this.user_value_;
		}
		public FocusIn() {
			this.layer_frame_.style.backgroundColor = 'rgb(0, 0, 255)';
			this.layer_frame_.style.boxShadow = "0px 0px 0px 0px";
			this.tab_.style.boxShadow = this.layer_frame_.style.boxShadow;
			this.Update(this.update_state_callback_, true, false);
		}
		public FocusOut() {
			this.layer_frame_.style.backgroundColor = 'rgb(255, 255, 255)';
			this.layer_frame_.style.boxShadow = "0px 8px 16px -2px rgba(10,10,10,0.1), 2px 2px 3px 0px rgba(0,0,0,0.48) inset";
			this.tab_.style.boxShadow = this.layer_frame_.style.boxShadow;
			this.Update(this.update_state_callback_, false, true);
		}
		public Update(callback: UpdatedStateCallback<UserType>, is_focusin: boolean, is_focusout: boolean) {
			callback(
				this.user_value_,
				this.order_, this.layer_name_.value, this.tab_.style.backgroundColor,
				this.layer_lock_checkbox_.checked, this.layer_view_checkbox_.checked,
				is_focusin, is_focusout,
				this.thumbnail_.getContext('2d'));
		}
		public DrawThumbnail(callback: DrawThumbnailCallback<UserType>) {
			callback(this.user_value_, this.order_, this.layer_lock_checkbox_.checked, this.layer_view_checkbox_.checked, this.thumbnail_.getContext('2d'));
		}
		public AddFoucsinCallback(
			callback: (focusin_layer: LayerUi<UserType>) => void) {
			this.layer_frame_.addEventListener('focusin', (event) => {
				callback(this);
			});
		}
		public AddUpdateStateCallback(callback: UpdatedStateCallback<UserType>) {
			this.layer_lock_checkbox_.addEventListener('change', (event) => {
				this.Update(callback, false, false);
			});
			this.layer_view_checkbox_.addEventListener('change', (event) => {
				this.Update(callback, false, false);
			});
			this.layer_name_.addEventListener('change', (event) => {
				this.Update(callback, false, false);
			});
			this.update_state_callback_ = callback;
		}

		public get order(): number {
			return this.order_;
		}
		public set order(new_order: number) {
			if (new_order < 0) {
				return;
			}
			this.order_ = new_order;
			this.layer_frame_.style.order = this.order_.toString();
			this.Update(this.update_state_callback_, false, false);
		}
	}
	export class LayerPaneUi<UserType> {
		private layers_: LayerUi<UserType>[];
		private frame_: HTMLDivElement;
		private command_holder_: HTMLDivElement;
		private new_layer_button_: HTMLButtonElement;
		private up_layer_button_: HTMLButtonElement;
		private down_layer_button_: HTMLButtonElement;
		private delete_layer_button_: HTMLButtonElement;
		private layer_holder_: HTMLDivElement;
		private swap_callback_: SwapCallback;
		private register_callback_: RegisterUserValueCallback<UserType>;
		private removed_callback_: RemovedCallback<UserType>;
		private updated_state_callback_: UpdatedStateCallback<UserType>;
		private draw_thumbnail_callback_: DrawThumbnailCallback<UserType>;
		private current_layer_: LayerUi<UserType> | null;
		constructor(
			register_callback: RegisterUserValueCallback<UserType>,
			destructed_callback: RemovedCallback<UserType>,
			swap_callback: SwapCallback,
			updated_state_callback: UpdatedStateCallback<UserType>,
			draw_thumbnail_callback: DrawThumbnailCallback<UserType>) {
			this.layers_ = new Array<LayerUi<UserType>>(0);
			this.frame_ = document.createElement("div");
			this.command_holder_ = document.createElement("div");
			this.new_layer_button_ = document.createElement("button");
			this.up_layer_button_ = document.createElement("button");
			this.down_layer_button_ = document.createElement("button");
			this.delete_layer_button_ = document.createElement("button");
			this.layer_holder_ = document.createElement("div");
			this.current_layer_ = null;

			this.command_holder_.style.display = "flex";
			this.command_holder_.style.backgroundColor = "rgb(95, 95, 95)";
			this.layer_holder_.style.display = "flex";
			this.layer_holder_.style.flexDirection = "column-reverse";
			this.layer_holder_.style.backgroundColor = "rgb(127, 127, 127)";
			this.new_layer_button_.innerText = "＋";
			this.up_layer_button_.innerText = "▲";
			this.down_layer_button_.innerText = "▼";
			this.delete_layer_button_.innerText = "×";

			this.new_layer_button_.addEventListener('click', (event) => {
				const registration_order = this.CalculateRegistrationOrder(this.current_layer_.order);
				const [layer_name, color, user_value] = this.register_callback_(registration_order);
				this.CreateNewLayer(this.current_layer_.order, layer_name, color, user_value);
			});
			this.up_layer_button_.addEventListener('click', (event) => {
				this.UpLayer(this.current_layer_.order);
			});
			this.down_layer_button_.addEventListener('click', (event) => {
				this.DownLayer(this.current_layer_.order);
			});
			this.delete_layer_button_.addEventListener('click', (event) => {
				if (1 < this.layers_.length) {
					this.DeleteCurrentLayer();
				}
			});

			this.register_callback_ = register_callback;
			this.removed_callback_ = destructed_callback;
			this.swap_callback_ = swap_callback;
			this.updated_state_callback_ = updated_state_callback;
			this.draw_thumbnail_callback_ = draw_thumbnail_callback;

			this.command_holder_.appendChild(this.new_layer_button_);
			this.command_holder_.appendChild(this.up_layer_button_);
			this.command_holder_.appendChild(this.down_layer_button_);
			this.command_holder_.appendChild(this.delete_layer_button_);
			this.frame_.appendChild(this.command_holder_);
			this.frame_.appendChild(this.layer_holder_);
			return;
		}
		private ChangeFocus(focus_in_layer: LayerUi<UserType>): void {
			if (focus_in_layer === this.current_layer_) {
				return;
			}
			focus_in_layer.FocusIn();
			if (this.current_layer_ !== null) {
				this.current_layer_.FocusOut();
			}
			this.current_layer_ = focus_in_layer;
			return;
		}
		private SwapLayer(lh_order: number, rh_order: number): boolean {
			let lh_layer: LayerUi<UserType> | null = null;
			let rh_layer: LayerUi<UserType> | null = null;
			for (let layer of this.layers_) {
				if (layer.order === lh_order) {
					lh_layer = layer;
				}
				if (layer.order === rh_order) {
					rh_layer = layer;
				}
				if ((lh_layer !== null) && (rh_layer !== null)) {
					break;
				}
			}
			if (lh_layer === null) {
				return false;
			}
			if (rh_layer === null) {
				return false;
			}
			const tmp_order = lh_layer.order;
			lh_layer.order = rh_layer.order;
			rh_layer.order = tmp_order;
			return true;
		}
		private CalculateRegistrationOrder(insert_target_order: number): number {
			if (this.layers_.length === 0) {
				return 0;
			}
			return Math.min(insert_target_order, this.layers_.length - 1) + 1;
		}
		public CreateNewLayer(
			insert_target_order: number, layer_name: string, color: string, user_value: UserType): void {
			const registration_order = this.CalculateRegistrationOrder(insert_target_order);
			if (0 < registration_order) {
				for (let layer of this.layers_) {
					if (registration_order <= layer.order) {
						layer.order++;
					}
				}
				insert_target_order += 1;
			}
			const new_layer = new LayerUi<UserType>(this.layer_holder_, insert_target_order, layer_name, color, user_value);
			new_layer.AddFoucsinCallback((focus_in_layer) => { this.ChangeFocus(focus_in_layer); });
			new_layer.AddUpdateStateCallback(this.updated_state_callback_);
			this.layers_.push(new_layer);
			this.ChangeFocus(new_layer);
			return;
		}
		public DeleteCurrentLayer(): void {
			if (this.current_layer_ === null) {
				return;
			}
			if (this.layers_.length === 1) {
				const destructed_order = this.current_layer_.order;
				const user_value = this.current_layer_.Destruct();
				this.removed_callback_(user_value, destructed_order);
				this.current_layer_ = null;
				this.layers_.splice(0, 1);
				return;
			}
			let target_index;
			for (target_index = 0; target_index < this.layers_.length; target_index++) {
				if (this.layers_[target_index] === this.current_layer_) {
					break;
				}
			}
			this.layers_.splice(target_index, 1);
			const current_order = Math.min(this.current_layer_.order, this.layers_.length - 1);
			for (let layer of this.layers_) {
				if (current_order < layer.order) {
					layer.order--;
				}
				if (current_order === layer.order) {
					const destructed_order = this.current_layer_.order;
					const user_value = this.current_layer_.Destruct();
					this.removed_callback_(user_value, destructed_order);
					this.current_layer_ = layer;
				}
			}
			this.current_layer_.FocusIn();
			return;
		}
		public DeleteAll() {
			const num_layers = this.layers_.length;
			for (let i = 0; i < num_layers; i++) {
				this.DeleteCurrentLayer();
			}
		}

		public CreateNewLayers(creation_parameters: Array<[number, string, string, UserType]>) {
			const ordered_parameters: [number, string, string, UserType][] = Array<[number, string, string, UserType]>(creation_parameters.length);
			for (let parameter of creation_parameters) {
				ordered_parameters[parameter[0]] = parameter;
			}
			for (let parameter of ordered_parameters) {
				parameter[0] = Math.max(0, parameter[0] - 1);
				this.CreateNewLayer(...parameter);
			}
		}
		public UpLayer(target_order: number): void {
			if (this.SwapLayer(target_order, target_order + 1)) {
				this.swap_callback_(target_order, target_order + 1);
			}
			return;
		}
		public DownLayer(target_order: number): void {
			if (this.SwapLayer(target_order, target_order - 1)) {
				this.swap_callback_(target_order, target_order - 1);
			}
			return;
		}
		public Draw() {
			for (let layer of this.layers_) {
				layer.DrawThumbnail(this.draw_thumbnail_callback_);
			}
		}
		public get node(): HTMLDivElement {
			return this.frame_;
		}
	}
	export type DonwloadDataRequestCallback = () => [string, Blob];
	export class DonwloadButton {
		private link_: HTMLAnchorElement;
		private button_: HTMLButtonElement;
		constructor(
			parent: HTMLElement, caption: string, dldata_request_callback: DonwloadDataRequestCallback) {
			this.link_ = document.createElement("a");
			this.button_ = document.createElement("button");
			this.link_.href = "#";
			this.button_.innerText = caption;
			this.button_.addEventListener('click', () => {
				const [dldata_filename, dldata_blob] = dldata_request_callback();
				const object_url = window.URL.createObjectURL(dldata_blob);
				this.link_.href = object_url;
				this.link_.download = dldata_filename;
			});
			this.link_.appendChild(this.button_);
			parent.appendChild(this.link_);
		}
	}

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
			color_cell.style.borderStyle = "solid";
			color_cell.style.borderColor = "#000000";
			color_cell.style.borderWidth = "1";
		}
		private static SetSelectedColorCellStyle(color_cell: HTMLTableDataCellElement) {
			color_cell.style.borderStyle = "solid";
			color_cell.style.borderColor = "#00ff00";
			color_cell.style.borderWidth = "1";
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

	export class PreviewWindowUi {
		private canvas_: HTMLCanvasElement;
		private canvas_frame_: HTMLDivElement;
		private scale_selector_: HTMLSelectElement;
		private command_frame_: HTMLDivElement;
		private holder_: HTMLDivElement;
		constructor(width: number, height: number) {
			this.canvas_ = document.createElement("canvas");
			this.canvas_.width = width;
			this.canvas_.height = height;
			this.canvas_frame_ = document.createElement("div");
			this.canvas_frame_.style.overflow = "scroll";
			this.canvas_frame_.style.resize = "both";
			this.canvas_frame_.appendChild(this.canvas_);
			this.scale_selector_ = document.createElement("select");
			const scale_array = [1, 2, 3, 4, 6, 8, 12, 16, 24];
			for (let scale of scale_array) {
				const scale_option = document.createElement("option")
				scale_option.value = scale.toString();
				scale_option.innerText = `x${scale}`;
				this.scale_selector_.appendChild(scale_option);
			}
			this.command_frame_ = document.createElement("div");
			this.command_frame_.style.textAlign = "right";
			this.command_frame_.innerText = "表示倍率";
			this.command_frame_.appendChild(this.scale_selector_);

			this.holder_ = document.createElement("div");
			this.holder_.appendChild(this.command_frame_);
			this.holder_.appendChild(this.canvas_frame_);
		}
		public get node(): HTMLDivElement {
			return this.holder_;
		}
		public Draw(pixels: number[][], color_table: string[], width: number, height: number) {
			const view_scale = parseInt(this.scale_selector_.value);
			if (this.canvas_.width !== width * view_scale) {
				this.canvas_.width = width * view_scale;
			}
			if (this.canvas_.height !== height * view_scale) {
				this.canvas_.height = height * view_scale;
			}
			const context = this.canvas_.getContext("2d");
			context.imageSmoothingEnabled = false;
			context.setTransform(1, 0, 0, 1, 0, 0);
			context.scale(view_scale, view_scale);
			for (let h = 0; h < height; h++) {
				for (let w = 0; w < width; w++) {
					const color_index = pixels[h][w];
					context.fillStyle = color_table[color_index];
					context.fillRect(w, h, 1, 1);
				}
			}
		}
	}

	const CreateLeftBox = function (): HTMLDivElement {
		const div = document.createElement("div");
		div.style.float = "left";
		return div;
	}
	const CreateRightBox = function (): HTMLDivElement {
		const div = document.createElement("div");
		div.style.float = "right";
		return div;
	}
	const CreateText = function (text: string): HTMLSpanElement {
		const span = document.createElement("span");
		span.innerText = text;
		return span;
	}

	export class SpriteAnimationPreviewWindowUi {
		private sprite_width_: HTMLInputElement;
		private sprite_height_: HTMLInputElement;
		private size_frame_: HTMLDivElement;
		private animation_step_par_frame_: HTMLInputElement;
		private animation_step_par_frame_holder_: HTMLDivElement;
		private scale_selector_: HTMLSelectElement;
		private scale_selector_holder_: HTMLDivElement;
		private command_frame_: HTMLDivElement;
		private canvas_: HTMLCanvasElement;
		private canvas_frame_: HTMLDivElement;
		private animation_playback_button_: HTMLButtonElement;
		private sprite_indices_: HTMLTextAreaElement;
		private settings_frame_: HTMLDivElement;
		private is_playing_: boolean;
		private sprite_animation_indices_: number[];
		private holder_: HTMLDivElement;
		constructor(width: number, height: number) {
			this.sprite_width_ = document.createElement("input");
			this.sprite_height_ = document.createElement("input");
			this.sprite_width_.type = "number";
			this.sprite_height_.type = "number";
			this.sprite_width_.min = "1";
			this.sprite_height_.min = "1";
			this.sprite_width_.value = width.toString();
			this.sprite_height_.value = height.toString();
			this.size_frame_ = document.createElement("div");
			this.size_frame_.appendChild(CreateText("サイズ"));
			this.size_frame_.appendChild(this.sprite_width_);
			this.size_frame_.appendChild(CreateText("x"));
			this.size_frame_.appendChild(this.sprite_height_);

			this.animation_step_par_frame_ = document.createElement("input");
			this.animation_step_par_frame_.type = "number";
			this.animation_step_par_frame_.min = "1";
			this.animation_step_par_frame_.value = "1";
			this.animation_step_par_frame_holder_ = CreateLeftBox();
			this.animation_step_par_frame_holder_.appendChild(this.animation_step_par_frame_);
			this.animation_step_par_frame_holder_.appendChild(CreateText("/１コマ"));

			this.scale_selector_ = document.createElement("select");
			const scale_array = [1, 2, 3, 4, 6, 8, 12, 16, 24];
			for (let scale of scale_array) {
				const scale_option = document.createElement("option")
				scale_option.value = scale.toString();
				scale_option.innerText = `x${scale}`;
				this.scale_selector_.appendChild(scale_option);
			}
			this.scale_selector_holder_ = CreateRightBox();
			this.scale_selector_holder_.appendChild(CreateText("表示倍率"));
			this.scale_selector_holder_.appendChild(this.scale_selector_);
			this.command_frame_ = document.createElement("div");
			this.command_frame_.appendChild(this.animation_step_par_frame_holder_);
			this.command_frame_.appendChild(this.scale_selector_holder_);

			this.canvas_ = document.createElement("canvas");
			this.canvas_.width = width;
			this.canvas_.height = height;
			this.canvas_frame_ = document.createElement("div");
			this.canvas_frame_.style.overflow = "scroll";
			this.canvas_frame_.style.resize = "both";
			this.canvas_frame_.style.clear = "both";
			this.canvas_frame_.appendChild(this.canvas_);

			this.animation_playback_button_ = document.createElement("button");
			this.animation_playback_button_.innerText = "▶︎";
			this.is_playing_ = false;
			this.animation_playback_button_.addEventListener('click', (event) => {
				const button = (<HTMLButtonElement>event.target);
				button.innerText = this.is_playing_ === true ? "▶︎" : "■";
				this.is_playing_ = !this.is_playing_;
			});
			this.sprite_animation_indices_ = new Array<number>(0);
			this.sprite_indices_ = document.createElement("textarea");
			this.sprite_indices_.style.height = "1.4em";
			this.sprite_indices_.innerText = "0";
			this.settings_frame_ = document.createElement("div");
			this.settings_frame_.appendChild(this.animation_playback_button_);
			this.settings_frame_.appendChild(this.sprite_indices_);

			this.holder_ = document.createElement("div");
			this.holder_.appendChild(this.size_frame_);
			this.holder_.appendChild(this.command_frame_);
			this.holder_.appendChild(this.canvas_frame_);
			this.holder_.appendChild(this.settings_frame_);
		}
		private UpdateSpriteIndicesArray() {
			const index_strings = this.sprite_indices_.value.split(',');
			this.sprite_animation_indices_.length = 0;
			for (let index_string of index_strings) {
				const parsed = parseInt(index_string);
				if (!isNaN(parsed)) {
					this.sprite_animation_indices_.push(parsed);
				}
			}
		}
		public get node(): HTMLDivElement {
			return this.holder_;
		}
		public Draw(pixels: number[][], color_table: string[], width: number, height: number, frame_count: number) {
			if (!this.is_playing_) {
				return;
			}
			this.UpdateSpriteIndicesArray();
			const num_indeices = this.sprite_animation_indices_.length;
			if (0 === num_indeices) {
				return;
			}
			const step_par_frame = Math.max(1, this.animation_step_par_frame_.valueAsNumber);
			const frame_number = Math.floor(frame_count / step_par_frame) % num_indeices;
			const sprite_index = this.sprite_animation_indices_[frame_number];
			const sprite_w = Math.max(1, Math.min(width, this.sprite_width_.valueAsNumber));
			const sprite_h = Math.max(1, Math.min(height, this.sprite_height_.valueAsNumber));
			const sprite_count_in_w = Math.floor(width / sprite_w);
			const sprite_count_in_h = Math.floor(height / sprite_h);
			const max_sprite_index = sprite_count_in_w * sprite_count_in_h;
			if (max_sprite_index <= sprite_index) {
				return;
			}
			const pixel_w_offset = Math.floor(sprite_index % sprite_count_in_w) * sprite_w;
			const pixel_h_offset = Math.floor(sprite_index / sprite_count_in_w) * sprite_h;
			const max_w = Math.min(pixel_w_offset + sprite_w, width);
			const max_h = Math.min(pixel_h_offset + sprite_h, height);
			const view_scale = parseInt(this.scale_selector_.value);

			if (this.canvas_.width !== sprite_w * view_scale) {
				this.canvas_.width = sprite_w * view_scale;
			}
			if (this.canvas_.height !== sprite_h * view_scale) {
				this.canvas_.height = sprite_h * view_scale;
			}
			const context = this.canvas_.getContext('2d');
			context.imageSmoothingEnabled = false;
			context.setTransform(1, 0, 0, 1, 0, 0);
			context.scale(view_scale, view_scale);
			for (let h = pixel_h_offset; h < max_h; h++) {
				for (let w = pixel_w_offset; w < max_w; w++) {
					const color_index = pixels[h][w];
					context.fillStyle = color_table[color_index];
					context.fillRect(w - pixel_w_offset, h - pixel_h_offset, 1, 1);
				}
			}
			return;
		}
	}

	export class TabPaneUi {
		private tab_frame_: HTMLDivElement;
		private local_tab_count_: number;
		private current_tab_: HTMLDivElement | null;
		private static tab_content_class_style_: HTMLStyleElement | null = null;
		private static global_tab_count_: number = 0;
		constructor() {
			if (TabPaneUi.tab_content_class_style_ === null) {
				const style = document.createElement("style");
				style.innerText
					= `.tab_content {`
					+ `display: none;`
					+ `clear: both;`
					+ `overflow: scroll;`
					+ `resize: both;`
					+ `}`
					+ `input[name="tab_tags"] {`
					+ `display: none;`
					+ `}`
					+ `.tab_tag {`
					+ `text-align: center;`
					+ `display: block;`
					+ `float: left;`
					+ `order: -1;`
					+ `margin: 2px 2px 0px;`
					+ `}`
					+ `input:checked + .tab_tag + .tab_content {`
					+ `display: block;`
					+ `}`;
				document.getElementsByTagName("head").item(0).appendChild(style);
				TabPaneUi.tab_content_class_style_ = style;
			}
			this.tab_frame_ = document.createElement("div");
			this.tab_frame_.style.display = "grid";
			//this.tab_frame_.style.gridAutoColumns = "max-content";
			this.tab_frame_.style.gridAutoColumns = "1fr";
			this.tab_frame_.style.gridAutoRows = "max-content";
			this.tab_frame_.style.gridTemplateAreas = `"t0" "c"`;
			this.current_tab_ = null;
			this.local_tab_count_ = 0;
		}
		private FitSize(): void {
			if (!("width" in this.current_tab_.style)) {
				return;
			}
			const contents = <HTMLCollectionOf<HTMLDivElement>>this.tab_frame_.getElementsByClassName("tab_content");
			const length = contents.length;
			for (let i = 0; i < length; i++) {
				contents[i].style.width = this.current_tab_.style.width;
				contents[i].style.height = this.current_tab_.style.height;
			}
			return;
		}
		public AddTab(content: HTMLElement, tab_title: string): void {
			const tag_id = `tab_${TabPaneUi.global_tab_count_}_tag`;
			const tab_radio = document.createElement("input");
			tab_radio.type = "radio";
			tab_radio.id = tag_id;
			tab_radio.name = "tab_tags";
			const tab_label = document.createElement("label");
			tab_label.htmlFor = tag_id;
			tab_label.innerText = tab_title;
			tab_label.className = "tab_tag";
			tab_label.style.backgroundColor = content.style.backgroundColor;
			tab_label.style.gridArea = `t${this.local_tab_count_}`;

			const content_frame = document.createElement("div");
			content_frame.appendChild(content);
			content_frame.className = "tab_content";
			content_frame.style.backgroundColor = content.style.backgroundColor;
			content_frame.style.order = "1";
			content_frame.style.gridArea = "c";

			if (this.tab_frame_.childElementCount === 0) {
				tab_radio.checked = true;
				this.current_tab_ = content_frame;
			}
			tab_radio.addEventListener("change", (event) => {
				this.FitSize();
				this.current_tab_ = content_frame;
			});

			this.local_tab_count_++;
			const tag_grids = new Array<string>(this.local_tab_count_);
			const content_grids = new Array<string>(this.local_tab_count_);
			for (let i = 0; i < this.local_tab_count_; i++) {
				tag_grids[i] = `t${i}`;
				content_grids[i] = "c";
			}
			this.tab_frame_.style.gridTemplateAreas = `"${tag_grids.join(" ")}" "${content_grids.join(" ")}"`;

			this.tab_frame_.appendChild(tab_radio);
			this.tab_frame_.appendChild(tab_label);
			this.tab_frame_.appendChild(content_frame);
			TabPaneUi.global_tab_count_++;
			return;
		}
		public get node(): HTMLDivElement {
			return this.tab_frame_;
		}
	}

	type Rectangle = { left: number, top: number; right: number; bottom: number };
	type ResizeCanvasCallback = (width: number, height: number) => void;
	export class CanvasUi {
		private canvas_width_spin_: HTMLInputElement;
		private canvas_height_spin_: HTMLInputElement;
		private small_grid_view_: HTMLInputElement;
		private small_grid_label_: HTMLLabelElement;
		private large_grid_view_: HTMLInputElement;
		private large_grid_label_: HTMLLabelElement;
		private color_index_view_: HTMLInputElement;
		private color_index_label_: HTMLLabelElement;
		private scale_selector_: HTMLSelectElement;
		private settings_holder_: HTMLDivElement;
		private last_width_: number;
		private last_height_: number;
		private last_scale_: number;
		private last_small_grid_view_: boolean;
		private last_large_grid_view_: boolean;
		private last_color_index_view_: boolean;
		private last_large_grid_width_: number;
		private last_large_grid_height_: number;
		private last_small_grid_color_: string;
		private last_pixels_: number[][];
		private last_pixel_mask_: boolean[][];
		private last_colors_: string[];
		private last_selected_rectangle_area_: Rectangle | null;
		private canvas_: HTMLCanvasElement;
		private canvas_box_: HTMLDivElement;
		private canvas_frame_: HTMLDivElement;
		private holder_: HTMLDivElement;
		private resize_cb_: ResizeCanvasCallback;
		private static count_: number = 0;
		private static CreateNumberInput(minimum: number, maximum: number): HTMLInputElement {
			const element = document.createElement("input");
			element.type = "number";
			element.min = minimum.toString();
			element.max = maximum.toString();
			return element;
		}
		private static CreateCheckBox(checkbox_id: string, label_content: HTMLElement): [HTMLInputElement, HTMLLabelElement] {
			const checkbox = document.createElement("input");
			checkbox.type = "checkbox";
			checkbox.id = checkbox_id;
			const label = document.createElement("label");
			label.htmlFor = checkbox.id;
			label.appendChild(label_content);
			return [checkbox, label];
		}
		private static DrawLine(canvas_context: CanvasRenderingContext2D, start_x: number, start_y: number, end_x: number, end_y: number) {
			canvas_context.moveTo(start_x, start_y);
			canvas_context.lineTo(end_x, end_y);
			return;
		}
		private static CreateSmallGridIcon(icon_size: number) {
			const icon = document.createElement("canvas");
			icon.width = icon_size;
			icon.height = icon_size;
			const icon_context = icon.getContext("2d");
			icon_context.fillStyle = "#101010";
			icon_context.fillRect(0, 0, icon_size, icon_size);
			icon_context.beginPath();
			icon_context.lineWidth = 1;
			icon_context.strokeStyle = "#909090";
			for (let i = -0.5; i < icon_size; i += 4) {
				CanvasUi.DrawLine(icon_context, i, 0, i, icon_size);
				CanvasUi.DrawLine(icon_context, 0, i, icon_size, i);
			}
			icon_context.stroke();
			return icon;
		}
		private static CreateLargeGridIcon(icon_size: number) {
			const icon = CanvasUi.CreateSmallGridIcon(icon_size);
			const icon_context = icon.getContext("2d");
			icon_context.beginPath();
			icon_context.lineWidth = 1;
			icon_context.strokeStyle = "#ffff00";
			for (let i = -0.5; i < icon_size; i += 8) {
				CanvasUi.DrawLine(icon_context, i, 0, i, icon_size);
				CanvasUi.DrawLine(icon_context, 0, i, icon_size, i);
			}
			icon_context.stroke();
			return icon;
		}
		private static CreateText(text: string): HTMLSpanElement {
			const span = document.createElement("span");
			span.innerText = text;
			return span;
		}

		constructor(width: number, height: number, resize_cb: ResizeCanvasCallback) {
			/* for Canvas Size */
			this.canvas_width_spin_ = CanvasUi.CreateNumberInput(1, 512);
			this.canvas_height_spin_ = CanvasUi.CreateNumberInput(1, 512);
			this.canvas_width_spin_.value = width.toString();
			this.canvas_height_spin_.value = height.toString();
			/* 最初の描画のために必ず差分が発生するように初期化しておく */
			this.last_width_ = 0;
			this.last_height_ = 0;

			/* view grid checkbox */
			[this.small_grid_view_, this.small_grid_label_] = CanvasUi.CreateCheckBox(`canvasui_sg_${CanvasUi.count_}`, CanvasUi.CreateSmallGridIcon(24));
			[this.large_grid_view_, this.large_grid_label_] = CanvasUi.CreateCheckBox(`canvasui_lg_${CanvasUi.count_}`, CanvasUi.CreateLargeGridIcon(24));
			[this.color_index_view_, this.color_index_label_] = CanvasUi.CreateCheckBox(`canvasui_ci_${CanvasUi.count_}`, CanvasUi.CreateText("色番号"));
			this.last_small_grid_view_ = false;
			this.last_large_grid_view_ = false;
			this.last_color_index_view_ = false;
			this.last_large_grid_width_ = 0;
			this.last_large_grid_height_ = 0;
			this.last_small_grid_color_ = '#000000';

			/* for Scale selector */
			this.scale_selector_ = document.createElement("select");
			const scales = [1, 2, 4, 8, 12, 16, 20, 24, 28, 32];
			for (let i = 0; i < scales.length; i++) {
				const preset_option = document.createElement("option");
				preset_option.value = scales[i].toString();
				preset_option.innerText = `x${scales[i]}`;
				this.scale_selector_.append(preset_option);
			}
			this.scale_selector_.selectedIndex = 0;
			this.last_scale_ = 1;

			/* settings holder */
			this.settings_holder_ = document.createElement("div");
			this.settings_holder_.appendChild(this.canvas_width_spin_);
			this.settings_holder_.appendChild(this.canvas_height_spin_);
			this.settings_holder_.appendChild(this.small_grid_view_);
			this.settings_holder_.appendChild(this.small_grid_label_);
			this.settings_holder_.appendChild(this.large_grid_view_);
			this.settings_holder_.appendChild(this.large_grid_label_);
			this.settings_holder_.appendChild(this.color_index_view_);
			this.settings_holder_.appendChild(this.color_index_label_);
			this.settings_holder_.appendChild(this.scale_selector_);
			this.settings_holder_.style.backgroundColor = "gray";
			this.settings_holder_.style.display = "flex";
			this.settings_holder_.style.padding = "2px 0px 2px 2px";

			/* for Canvas */
			this.canvas_ = document.createElement("canvas");
			this.canvas_.width = width;
			this.canvas_.height = height;
			this.canvas_.addEventListener("contextmenu", (event) => {
				event.preventDefault();
				return false;
			});
			this.canvas_box_ = document.createElement("div");
			this.canvas_box_.style.width = "max-content";
			this.canvas_box_.style.height = "max-content";
			this.canvas_frame_ = document.createElement("div");
			this.canvas_frame_.style.overflow = "scroll";
			this.canvas_frame_.style.resize = "both";
			this.canvas_frame_.style.clear = "both";
			this.canvas_box_.appendChild(this.canvas_);
			this.canvas_frame_.appendChild(this.canvas_box_);

			this.last_pixels_ = JSON.parse(JSON.stringify((new Array<Array<number>>(512)).fill((new Array<number>(512)).fill(0))));
			this.last_pixel_mask_ = JSON.parse(JSON.stringify((new Array<Array<boolean>>(512)).fill((new Array<boolean>(512)).fill(false))));
			this.last_colors_ = JSON.parse(JSON.stringify(new Array<string>(256).fill('#000000')));
			this.last_selected_rectangle_area_ = null;

			/* compose */
			this.holder_ = document.createElement("div");
			this.holder_.appendChild(this.settings_holder_);
			this.holder_.appendChild(this.canvas_frame_);

			this.resize_cb_ = resize_cb;
			this.canvas_width_spin_.addEventListener("input", (event) => {
				const width = (<HTMLInputElement>event.target).valueAsNumber;
				const height = this.canvas_height_spin_.valueAsNumber;
				if (!isNaN(width) && !isNaN(height)) {
					resize_cb(width, height);
				}
			});
			this.canvas_height_spin_.addEventListener("input", (event) => {
				const height = (<HTMLInputElement>event.target).valueAsNumber;
				const width = this.canvas_width_spin_.valueAsNumber;
				if (!isNaN(width) && !isNaN(height)) {
					resize_cb(width, height);
				}
			});
		}

		public get node(): HTMLDivElement {
			return this.holder_;
		}
		public get canvas(): HTMLCanvasElement {
			return this.canvas_;
		}

		private static PartiallyDrawGrid(
			canvas_context: CanvasRenderingContext2D,
			w_grid_set: Set<number>, h_grid_set: Set<number>,
			width: number, height: number, scale: number, grid_color: string) {
			canvas_context.beginPath();
			const line_height = height;
			const line_width = width;
			const adjust_e = -(1 / scale) / 2;
			for (let w of w_grid_set) {
				const x = (w + 1) + adjust_e;
				CanvasUi.DrawLine(canvas_context, x, -0.5, x, line_height + 0.5);
			}
			for (let h of h_grid_set) {
				const y = (h + 1) + adjust_e;
				CanvasUi.DrawLine(canvas_context, -0.5, y, line_width + 0.5, y);
			}
			canvas_context.lineWidth = 1 / scale;
			canvas_context.strokeStyle = grid_color;
			canvas_context.stroke();
		}
		private static DrawSmallGrid(
			canvas_context: CanvasRenderingContext2D,
			width: number, height: number, scale: number, grid_color: string) {
			const all_w_grid_set = new Set<number>();
			const all_h_grid_set = new Set<number>();
			for (var w = 0; w < width; w++) {
				all_w_grid_set.add(w);
			}
			for (var h = 0; h < height; h++) {
				all_h_grid_set.add(h);
			}
			CanvasUi.PartiallyDrawGrid(canvas_context, all_w_grid_set, all_h_grid_set, width, height, scale, grid_color);
		}

		private static DrawLargeGrid(
			canvas_context: CanvasRenderingContext2D,
			width: number, height: number, scale: number, grid_color: string,
			grid_width: number, grid_height: number) {
			const all_w_grid_set = new Set<number>();
			const all_h_grid_set = new Set<number>();
			const large_grid_width = Math.min(512, Math.max(2, grid_width));
			const large_grid_height = Math.min(512, Math.max(2, grid_height));
			for (var w = large_grid_width; w <= width; w += large_grid_width) {
				all_w_grid_set.add(w - 1);
			}
			for (var h = large_grid_height; h <= height; h += large_grid_height) {
				all_h_grid_set.add(h - 1);
			}
			canvas_context.setLineDash([0.5, 0.5]);
			CanvasUi.PartiallyDrawGrid(canvas_context, all_w_grid_set, all_h_grid_set, width, height, scale, grid_color);
			canvas_context.setLineDash([]);
		}

		private static PartiallyDrawColorIndex(
			canvas_context: CanvasRenderingContext2D,
			pixels: number[][], target_pixel_set: Set<number>,
			width: number, height: number, scale: number, color) {
			const font_size = 8;
			canvas_context.save();
			canvas_context.textAlign = "center";
			canvas_context.textBaseline = "middle";
			canvas_context.font = `8px gothic`;
			canvas_context.fillStyle = color;
			canvas_context.scale(1 / scale, 1 / scale);
			const y_offset = font_size / 2;
			target_pixel_set.forEach((pixel_index) => {
				const w = Math.floor(pixel_index % width);
				const h = Math.floor(pixel_index / width);
				const dst_x = w * scale;
				const dst_y = h * scale;
				const ci = pixels[h][w];
				const x_offset = scale - String(ci).length * (font_size / 2 - 1) - 1;
				canvas_context.fillText(ci.toString(), dst_x + x_offset, dst_y + y_offset);
			});
			canvas_context.restore();
		}

		private static DrawColorIndex(
			canvas_context: CanvasRenderingContext2D,
			pixels: number[][],
			width: number, height: number, scale: number, color: string) {
			const target_pixel_set = new Set<number>();
			for (var h = 0; h < height; h++) {
				for (var w = 0; w < width; w++) {
					target_pixel_set.add(h * width + w);
				}
			}
			CanvasUi.PartiallyDrawColorIndex(canvas_context, pixels, target_pixel_set, width, height, scale, color);
		}

		private static DrawSelectedRectangleArea(
			canvas_context: CanvasRenderingContext2D,
			rectangle: Rectangle, scale: number, frame_count: number) {
			const e_ = 0.5;
			canvas_context.setTransform(1, 0, 0, 1, 0, 0);
			const point_left = rectangle.left * scale + e_;
			const point_top = rectangle.top * scale + e_;
			const point_right = (rectangle.right + 1) * scale - e_;
			const point_bottom = (rectangle.bottom + 1) * scale - e_;
			canvas_context.setLineDash([4, 4]);
			canvas_context.lineWidth = 1;
			canvas_context.beginPath();
			canvas_context.strokeStyle = "#ffffff";
			canvas_context.lineDashOffset = frame_count % 8;
			CanvasUi.DrawLine(canvas_context, point_left, point_top, point_right, point_top);
			CanvasUi.DrawLine(canvas_context, point_right, point_top, point_right, point_bottom);
			CanvasUi.DrawLine(canvas_context, point_right, point_bottom, point_left, point_bottom);
			CanvasUi.DrawLine(canvas_context, point_left, point_bottom, point_left, point_top);
			canvas_context.stroke();
			canvas_context.beginPath();
			canvas_context.strokeStyle = "#000000";
			canvas_context.lineDashOffset = (frame_count + 4) % 8;
			CanvasUi.DrawLine(canvas_context, point_left, point_top, point_right, point_top);
			CanvasUi.DrawLine(canvas_context, point_right, point_top, point_right, point_bottom);
			CanvasUi.DrawLine(canvas_context, point_right, point_bottom, point_left, point_bottom);
			CanvasUi.DrawLine(canvas_context, point_left, point_bottom, point_left, point_top);
			canvas_context.stroke();
			canvas_context.setLineDash([]);
		}
		private static ExtractTouchedPixelsAndGrids(
			current_pixels: number[][], last_pixels: number[][],
			current_pixel_mask: boolean[][], last_pixel_mask: boolean[][],
			width: number, height: number,
			current_colors: string[], last_colors: string[],
			last_selected_rectangle_area: Rectangle | null
		): [pixel_index_set: Set<number>, grid_w_set: Set<number>, grid_h_set: Set<number>] {
			const pixel_index_set = new Set<number>();
			const grid_w_set = new Set<number>();
			const grid_h_set = new Set<number>();
			/* ピクセル値の変化差分を抽出 */
			for (let h = 0; h < height; h++) {
				for (let w = 0; w < width; w++) {
					let is_touched = false;
					if (last_pixels[h][w] !== current_pixels[h][w]) {
						is_touched = true;
					} else if (last_pixel_mask[h][w] !== current_pixel_mask[h][w]) {
						is_touched = true;
					} else {
						/* 色が変わっている場合も更新対象 */
						const ci = last_pixels[h][w];
						if (last_colors[ci] !== current_colors[ci]) {
							is_touched = true;
						}
					}
					if (is_touched) {
						pixel_index_set.add(h * width + w);
						grid_w_set.add(w);
						grid_h_set.add(h);
					}
				}
			}
			/* 前回の矩形選択範囲の線を描画したピクセルは今回上書きが必要 */
			if (last_selected_rectangle_area !== null) {
				const rect = last_selected_rectangle_area;
				if (rect.top === rect.bottom) {
					for (let w = rect.left; w <= rect.right; w++) {
						pixel_index_set.add(rect.top * width + w);
					}
				} else {
					for (let w = rect.left; w <= rect.right; w++) {
						pixel_index_set.add(rect.top * width + w);
						pixel_index_set.add(rect.bottom * width + w);
					}
				}
				const offset_top = rect.top + 1;
				const offset_bottom = rect.bottom - 1;
				if (0 <= (offset_bottom - offset_top)) {
					if (rect.left === rect.right) {
						for (let h = offset_top; h <= offset_bottom; h++) {
							pixel_index_set.add(h * width + rect.left);
						}
					} else {
						for (let h = offset_top; h <= offset_bottom; h++) {
							pixel_index_set.add(h * width + rect.left);
							pixel_index_set.add(h * width + rect.right);
						}
					}
				}
				for (let h = rect.top; h <= rect.bottom; h++) {
					for (let w = rect.left; w <= rect.right; w++) {
						grid_w_set.add(w);
						grid_h_set.add(h);
					}
				}
			}
			return [pixel_index_set, grid_w_set, grid_h_set];
		}
		private UpdateParameters(
			large_grid_width: number, large_grid_height: number, small_grid_color: string): "need_all" | "partial" {
			const scale = parseInt(this.scale_selector_.value);
			let width = parseInt(this.canvas_width_spin_.value);
			let height = parseInt(this.canvas_height_spin_.value);
			const small_grid_view = this.small_grid_view_.checked;
			const large_grid_view = this.large_grid_view_.checked;
			const color_index_view = this.color_index_view_.checked;
			if (isNaN(width)) {
				width = this.last_width_;
			}
			if (isNaN(height)) {
				height = this.last_height_;
			}
			if (this.canvas_.width !== width * scale) {
				this.canvas_.width = width * scale;
			}
			if (this.canvas_.height !== height * scale) {
				this.canvas_.height = height * scale;
			}
			const need_update_all
				= (this.last_scale_ !== scale)
				|| (this.last_width_ !== width)
				|| (this.last_height_ !== height)
				|| (this.last_small_grid_view_ !== small_grid_view)
				|| (this.last_large_grid_view_ !== large_grid_view)
				|| (this.last_large_grid_width_ !== large_grid_width)
				|| (this.last_large_grid_height_ !== large_grid_height)
				|| (this.last_color_index_view_ !== color_index_view)
				|| (this.last_small_grid_color_ !== small_grid_color);
			this.last_scale_ = scale;
			this.last_width_ = width;
			this.last_height_ = height;
			this.last_small_grid_view_ = small_grid_view;
			this.last_large_grid_view_ = large_grid_view;
			this.last_large_grid_width_ = large_grid_width;
			this.last_large_grid_height_ = large_grid_height;
			this.last_color_index_view_ = color_index_view;
			this.last_small_grid_color_ = small_grid_color;
			return need_update_all ? "need_all" : "partial";
		}

		public Draw(
			pixels: number[][], pixels_mask: boolean[][], color_table: string[],
			small_grid_color: string,
			large_grid_width: number, large_grid_height: number,
			large_grid_color: string,
			selected_rectangle_area: { left: number, top: number, right: number, bottom: number } | null,
			frame_count: number) {
			const draw_type = this.UpdateParameters(large_grid_width, large_grid_height, small_grid_color);
			const scale = this.last_scale_;
			const width = this.last_width_;
			const height = this.last_height_;
			const context = this.canvas_.getContext("2d");
			context.imageSmoothingEnabled = false;
			context.setTransform(1, 0, 0, 1, 0, 0);
			context.scale(scale, scale);
			if (draw_type === "need_all") {
				/* ピクセル描画 */
				for (let h = 0; h < height; h++) {
					for (let w = 0; w < width; w++) {
						const color_index = pixels[h][w];
						context.fillStyle = color_table[color_index];
						context.fillRect(w, h, 1, 1);
					}
				}

				/* マスク表示 */
				context.fillStyle = '#ff0000';
				context.globalAlpha = 0.5;
				for (var h = 0; h < height; h++) {
					for (var w = 0; w < width; w++) {
						if (pixels_mask[h][w]) {
							context.fillRect(w, h, 1, 1);
						}
					}
				}
				context.globalAlpha = 1;

				/* グリッド描画 */
				if (this.small_grid_view_.checked) {
					CanvasUi.DrawSmallGrid(context, width, height, scale, small_grid_color);
				}
				/* 色番号描画 */
				if (this.color_index_view_.checked) {
					CanvasUi.DrawColorIndex(context, pixels, width, height, scale, small_grid_color);
				}

				/* キャッシュ更新 */
				for (let h = 0; h < height; h++) {
					for (let w = 0; w < width; w++) {
						this.last_pixels_[h][w] = pixels[h][w];
						this.last_pixel_mask_[h][w] = pixels_mask[h][w];
					}
				}
				/* 色のキャッシュ更新 */
				for (let i = 0; i < 256; i++) {
					this.last_colors_[i] = color_table[i];
				}
			} else {
				/* 際描画が必要なピクセルとグリッドを抽出 */
				const [written_pixel_set, update_w_grid_set, update_h_grid_set] =
					CanvasUi.ExtractTouchedPixelsAndGrids(
						pixels, this.last_pixels_, pixels_mask, this.last_pixel_mask_, width, height,
						color_table, this.last_colors_,
						this.last_selected_rectangle_area_);

				/* ピクセルの部分描画 */
				written_pixel_set.forEach((pixel_index) => {
					const w = Math.floor(pixel_index % width);
					const h = Math.floor(pixel_index / width);
					const ci = pixels[h][w];
					const color = color_table[ci];
					context.fillStyle = color;
					context.fillRect(w, h, 1, 1);
				});

				/* マスクの部分表示 */
				context.fillStyle = '#ff0000';
				context.globalAlpha = 0.5;
				written_pixel_set.forEach((pixel_index) => {
					const w = Math.floor(pixel_index % width);
					const h = Math.floor(pixel_index / width);
					if (pixels_mask[h][w]) {
						context.fillRect(w, h, 1, 1);
					}
				});
				context.globalAlpha = 1;

				/* グリッドの部分描画 */
				if (this.small_grid_view_.checked) {
					CanvasUi.PartiallyDrawGrid(context, update_w_grid_set, update_h_grid_set, width, height, scale, small_grid_color);
				}
				/* 色番号の部分描画 */
				if (this.color_index_view_.checked) {
					CanvasUi.PartiallyDrawColorIndex(context, pixels, written_pixel_set, width, height, scale, small_grid_color);
				}
			}

			if (this.large_grid_view_.checked) {
				CanvasUi.DrawLargeGrid(context, width, height, scale, large_grid_color, large_grid_width, large_grid_height);
			}

			if (selected_rectangle_area !== null) {
				CanvasUi.DrawSelectedRectangleArea(context, selected_rectangle_area, scale, frame_count);
			}

			/* キャッシュ更新 */
			/* ピクセルおよびマスク */
			for (let h = 0; h < height; h++) {
				for (let w = 0; w < width; w++) {
					this.last_pixels_[h][w] = pixels[h][w];
					this.last_pixel_mask_[h][w] = pixels_mask[h][w];
				}
			}
			/* 色　*/
			for (let i = 0; i < 256; i++) {
				this.last_colors_[i] = color_table[i];
			}
			/* 矩形選択 */
			this.last_selected_rectangle_area_ = selected_rectangle_area;
			return;
		}
		public get canvas_width(): number {
			return this.last_width_;
		}
		public get canvas_height(): number {
			return this.last_height_;
		}
		public set canvas_width(new_width: number) {
			this.canvas_width_spin_.valueAsNumber = new_width;
		}
		public set canvas_height(new_height: number) {
			this.canvas_height_spin_.valueAsNumber = new_height;
		}
		public get edit_scale(): number {
			return this.last_scale_;
		}
		public set edit_scale(new_scale: number) {
			const scales = [1, 2, 4, 8, 12, 16, 20, 24, 28, 32];
			const index = scales.indexOf(new_scale);
			if (0 <= index) {
				this.scale_selector_.selectedIndex = index;
			}
		}
	}
}