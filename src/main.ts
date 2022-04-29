import { WindowsIndexColorBitmap } from "./windows_bitmap"
import { Misc } from "./misc"
import { Browser } from "./browser"
import { CanvasUi } from "./gui/canvas"
import { ColorPaletteTableUi } from "./gui/color_palette"
import { DonwloadButton } from "./gui/download_button"
import { PreviewWindowUi } from "./gui/preview_window"
import { SpriteAnimationPreviewWindowUi } from "./gui/sprite_animation_preview_window"
import { LayerPaneUi } from "./gui/layer"
import { TabPaneUi } from "./gui/tab_pane"
import { CanvasTools, PixelPoint } from "./canvas_tools";
import { RgbColor, RgbColorPalette } from "./rgb_color_palette";

const data_format_version: number = 1;
const view_font_size: number = 8;
const max_edit_width: number = 512;
const max_edit_height: number = 512;
const default_edit_width: number = 32;
const default_edit_height: number = 32;
const default_edit_scale: number = 8;
const large_grid_color = '#ffff00';

class EditLogger {
	private undo_stack_: MultiLayerIndexColorBitmap[];
	private redo_stack_: MultiLayerIndexColorBitmap[];
	constructor() {
		this.undo_stack_ = new Array<MultiLayerIndexColorBitmap>(0);
		this.redo_stack_ = new Array<MultiLayerIndexColorBitmap>(0);
	}
	public IsUndoLogEmpty(): boolean {
		return (this.undo_stack_.length === 0) ? true : false;
	}
	public IsRedoLogEmpty(): boolean {
		return (this.redo_stack_.length === 0) ? true : false;
	}
	public PushUndoLog(log_data: MultiLayerIndexColorBitmap): void {
		this.undo_stack_.push(log_data);
	}
	public PushRedoLog(log_data: MultiLayerIndexColorBitmap): void {
		this.redo_stack_.push(log_data);
	}
	public PopUndoLog(): MultiLayerIndexColorBitmap {
		return this.undo_stack_.pop();
	}
	public PopRedoLog(): MultiLayerIndexColorBitmap {
		return this.redo_stack_.pop();
	}
	public ClearRedoLog(): void {
		this.redo_stack_.splice(0);
	}
}

class IndexColorBitmap {
	width: number;
	height: number;
	color_palette: string[];
	pixels: number[][];
	constructor(width: number, height: number, color_palette: string[], pixels: number[][]) {
		this.width = width;
		this.height = height;
		this.color_palette = color_palette;
		this.pixels = pixels;
	};
}

class IndexColorBitmapLayer {
	order: number;
	name: string;
	tag_color: string;
	pixels: number[][];
}

class MultiLayerIndexColorBitmap {
	format_version = data_format_version;
	width: number;
	height: number;
	color_palette: RgbColor[];
	layers: IndexColorBitmapLayer[];
	Marge(): IndexColorBitmap {
		const num_layers = this.layers.length;
		const sorted_layers = new Array<IndexColorBitmapLayer>(num_layers);
		for (let layer of this.layers) {
			sorted_layers[num_layers - layer.order - 1] = layer;
		}
		const default_bg_color = 0;
		const max_w = this.width;
		const max_h = this.height;
		const bg_ci = default_bg_color;
		const marged_pixels = Misc.Make2dArray<number>(max_w, max_h, 0);
		for (let h = 0; h < max_h; h++) {
			for (let w = 0; w < max_w; w++) {
				for (let i = 0; i < sorted_layers.length; i++) {
					const source_layer = sorted_layers[i];
					const src_ci = source_layer.pixels[h][w];
					if (src_ci !== bg_ci) {
						marged_pixels[h][w] = src_ci;
						break;
					}
				}
			}
		}
		const color_palette = new Array<string>(256);
		for (let i = 0; i < 256; i++) {
			color_palette[i] = this.color_palette[i].ToRgbString();
		}
		return new IndexColorBitmap(max_w, max_h, color_palette, marged_pixels);
	}

}

class PixelLayer {
	pixels: number[][];
	order: number;
	name: string;
	is_visible: boolean;
	is_locked: boolean;
	tag_color: string;
	constructor(order: number, name: string, tag_color: string, max_width: number, max_height: number) {
		this.pixels = Misc.Make2dArray<number>(max_width, max_height, 0);
		this.order = order;
		this.name = name;
		this.tag_color = tag_color;
		this.is_locked = false;
		this.is_locked = true;
	}
}

class Data {
	private current_pixel_layer_: PixelLayer | null;
	private pixel_layers_: Map<PixelLayer, PixelLayer>;
	private pixels_mask_: boolean[][];
	private edit_width_: number;
	private edit_height_: number;
	private selected_color_index_: number;
	private color_palette_: RgbColorPalette;
	private logger_: EditLogger;
	private pixels_clipboard_: number[][];
	private clipboard_stored_width_: number;
	private clipboard_stored_height_: number;
	private selected_bg_color_index_: number;
	public constructor(default_width: number, default_height: number, max_width: number, max_height: number) {
		this.edit_width_ = default_width;
		this.edit_height_ = default_height;
		this.current_pixel_layer_ = null;
		this.pixel_layers_ = new Map<PixelLayer, PixelLayer>();
		this.pixels_clipboard_ = Misc.Make2dArray<number>(max_width, max_height, 0);
		this.clipboard_stored_width_ = 0;
		this.clipboard_stored_height_ = 0;
		this.pixels_mask_ = Misc.Make2dArray<boolean>(max_width, max_height, false);
		this.selected_color_index_ = 0;
		this.selected_bg_color_index_ = 0;
		this.color_palette_ = new RgbColorPalette();
		this.logger_ = new EditLogger();
	}
	public SetCurrentPixelLayer(pixel_layer: PixelLayer): void {
		this.current_pixel_layer_ = pixel_layer;
	}
	public IsCurrentPixelLayer(pixel_layer: PixelLayer): boolean {
		return (this.current_pixel_layer_ === pixel_layer);
	}
	public get edit_width(): number {
		return this.edit_width_;
	}
	public set edit_width(new_width: number) {
		this.edit_width_ = new_width;
	}
	public get edit_height(): number {
		return this.edit_height_;
	}
	public set edit_height(new_height: number) {
		this.edit_height_ = new_height;
	}
	public get selected_color_index(): number {
		return this.selected_color_index_;
	}
	public set selected_color_index(new_index: number) {
		this.selected_color_index_ = new_index;
	}
	public get selected_bg_color_index(): number {
		return this.selected_bg_color_index_;
	}
	public AppendLayer(pixel_layer: PixelLayer): void {
		this.pixel_layers_.set(pixel_layer, pixel_layer);
	}
	public RemoveLayer(pixel_layer: PixelLayer): void {
		this.pixel_layers_.delete(pixel_layer);
		if (this.current_pixel_layer_ === pixel_layer) {
			this.current_pixel_layer_ = null;
		}
	}
	public RemoveAllLayers(): void {
		this.pixel_layers_.clear();
		this.current_pixel_layer_ = null;
	}
	public SetMaskFlagsByRectangle(left: number, top: number, right: number, bottom: number, flag: boolean): void {
		for (let h = top; h <= bottom; h++) {
			for (let w = left; w <= right; w++) {
				this.pixels_mask_[h][w] = flag;
			}
		}
	}
	public TurnMask(): void {
		for (let h = 0; h < this.edit_height_; h++) {
			for (let w = 0; w < this.edit_width_; w++) {
				this.pixels_mask_[h][w] = !this.pixels_mask_[h][w];
			}
		}
	}
	public IsMasked(w: number, h: number): boolean {
		return this.pixels_mask_[h][w];
	}
	public get pixels_mask(): boolean[][] {
		return this.pixels_mask_;
	}
	public WriteMap(w: number, h: number, color_index: number) {
		if (this.IsMasked(w, h)) {
			return;
		}
		if (this.current_pixel_layer_.is_locked === true) {
			return;
		}
		this.current_pixel_layer_.pixels[h][w] = color_index;
	}
	public GetWrittenColorIndex(w: number, h: number): number {
		return this.current_pixel_layer_.pixels[h][w];
	}
	public GetRgbColorFromPalette(index: number): RgbColor {
		return this.color_palette_.GetColor(index);
	}
	public GetColorTable(): string[] {
		const color_table = new Array<string>(256);
		for (let i = 0; i < 256; i++) {
			color_table[i] = this.color_palette_.GetColor(i).ToHexColor();
		}
		return color_table;
	}
	public DeleteAllUnusedColors(): void {
		const histogram = new Array<number>(256).fill(0);
		for (let h = 0; h < this.edit_height_; h++) {
			for (let w = 0; w < this.edit_width_; w++) {
				histogram[this.current_pixel_layer_.pixels[h][w]]++;
			}
		}
		for (let i = 0; i < 256; i++) {
			if (histogram[i] === 0) {
				data.color_palette_.SetPresetColor(i, "black");
			}
		}
	}
	public SwapColor(lh_index: number, rh_index: number): void {
		if (lh_index === rh_index) {
			return;
		}
		for (let h = 0; h < this.edit_height_; h++) {
			for (let w = 0; w < this.edit_width_; w++) {
				const color_index = this.current_pixel_layer_.pixels[h][w];
				if (color_index === lh_index) {
					this.current_pixel_layer_.pixels[h][w] = rh_index;
				}
				if (color_index === rh_index) {
					this.current_pixel_layer_.pixels[h][w] = lh_index;
				}
			}
		}
		this.color_palette_.SwapColor(lh_index, rh_index);
		return;
	}
	public GetDescendingOrderedLayers(): PixelLayer[] {
		const num_layers = this.pixel_layers_.size;
		const sorted_layers = new Array<PixelLayer>(num_layers);
		for (let layer of this.pixel_layers_.values()) {
			sorted_layers[num_layers - layer.order - 1] = layer;
		}
		return sorted_layers;
	}
	public GetUnorderedLayersIterator(): IterableIterator<PixelLayer> {
		return this.pixel_layers_.values();
	}
	public CreateLayerCreationParameters(): Array<[number, string, string, PixelLayer]> {
		const creation_parameters = new Array<[number, string, string, PixelLayer]>(0);
		for (const pixel_layer of this.pixel_layers_.values()) {
			creation_parameters.push([pixel_layer.order, pixel_layer.name, pixel_layer.tag_color, pixel_layer]);
		}
		return creation_parameters;
	}

	public MakeSaveData(): MultiLayerIndexColorBitmap {
		const edit_w_count = this.edit_width_;
		const edit_h_count = this.edit_height_;
		const save_pixels = new Array<number[]>(edit_h_count);
		for (var h = 0; h < edit_h_count; h++) {
			save_pixels[h] = this.current_pixel_layer_.pixels[h].slice(0, edit_w_count);
		}
		const color_palette = new Array<RgbColor>(256);
		for (var i = 0; i < 256; i++) {
			color_palette[i] = this.color_palette_.GetColor(i);
		}
		const save_data = new MultiLayerIndexColorBitmap();
		save_data.width = edit_w_count;
		save_data.height = edit_h_count;
		save_data.color_palette = color_palette;
		save_data.layers = new Array<IndexColorBitmapLayer>(0);
		for (let layer of this.pixel_layers_.values()) {
			const save_layer = new IndexColorBitmapLayer();
			save_layer.order = layer.order;
			save_layer.name = layer.name;
			save_layer.tag_color = layer.tag_color;
			save_layer.pixels = Misc.Make2dArray<number>(edit_w_count, edit_h_count, 0);
			for (let h = 0; h < edit_h_count; h++) {
				for (let w = 0; w < edit_w_count; w++) {
					save_layer.pixels[h][w] = layer.pixels[h][w];
				}
			}
			save_data.layers.push(save_layer);
		}
		return save_data;
	}
	public CopyFromIndexColorBitmap(bmp_data: IndexColorBitmap, name: string): void {
		const edit_w = bmp_data.width;
		const edit_h = bmp_data.height;
		this.edit_width_ = edit_w;
		this.edit_height_ = edit_h;
		for (let i = 0; i < 256; i++) {
			this.color_palette_.SetColorByString(i, bmp_data.color_palette[i]);
		}
		this.pixel_layers_.clear();
		const layer = new PixelLayer(0, name, '#90b080', max_edit_width, max_edit_height);
		for (let h = 0; h < edit_h; h++) {
			for (let w = 0; w < edit_w; w++) {
				layer.pixels[h][w] = bmp_data.pixels[h][w];
			}
		}
		this.pixel_layers_.set(layer, layer);
		return;
	}
	public CopyFromMultiLayerIndexColorBitmap(raw_data: MultiLayerIndexColorBitmap) {
		const edit_w = raw_data.width;
		const edit_h = raw_data.height;
		this.edit_width_ = edit_w;
		this.edit_height_ = edit_h;
		for (let i = 0; i < 256; i++) {
			this.color_palette_.SetColor(i, raw_data.color_palette[i]);
		}
		this.pixel_layers_.clear();
		for (let raw_layer of raw_data.layers) {
			const layer = new PixelLayer(raw_layer.order, raw_layer.name, raw_layer.tag_color, max_edit_width, max_edit_height);
			for (let h = 0; h < edit_h; h++) {
				for (let w = 0; w < edit_w; w++) {
					layer.pixels[h][w] = raw_layer.pixels[h][w];
				}
			}
			this.pixel_layers_.set(layer, layer);
		}
		return;
	}

	public CopyToClipBoard(left: number, top: number, right: number, bottom: number): void {
		const copy_w = right - left + 1;
		const copy_h = bottom - top + 1;
		for (let dst_h = 0; dst_h < copy_h; dst_h++) {
			const src_h = top + dst_h;
			for (let dst_w = 0; dst_w < copy_w; dst_w++) {
				const src_w = left + dst_w;
				this.pixels_clipboard_[dst_h][dst_w] = this.current_pixel_layer_.pixels[src_h][src_w];
			}
		}
		this.clipboard_stored_width_ = copy_w;
		this.clipboard_stored_height_ = copy_h;
	}

	public PasteToCanvas(left: number, top: number) {
		const paste_w = Math.min(this.clipboard_stored_width_, this.edit_width_ - left);
		const paste_h = Math.min(this.clipboard_stored_height_, this.edit_height_ - top);
		for (let src_h = 0; src_h < paste_h; src_h++) {
			const dst_h = top + src_h;
			for (let src_w = 0; src_w < paste_w; src_w++) {
				if (this.selected_bg_color_index_ !== this.pixels_clipboard_[src_h][src_w]) {
					const dst_w = left + src_w;
					data.WriteMap(dst_w, dst_h, this.pixels_clipboard_[src_h][src_w]);
				}
			}
		}
	}

	public PushUndoLog(): void {
		const current_data = data.MakeSaveData();
		this.logger_.PushUndoLog(current_data);
		this.logger_.ClearRedoLog();
		AutoSave();
	}
	public Undo(): void {
		if (this.logger_.IsUndoLogEmpty()) {
			return;
		}
		const current_data = data.MakeSaveData();
		this.logger_.PushRedoLog(current_data);
		const undo_data = this.logger_.PopUndoLog();
		this.CopyFromMultiLayerIndexColorBitmap(undo_data);
		layer_pane_ui.CreateBrandNewLayers(this.CreateLayerCreationParameters());
	}
	public Redo() {
		if (this.logger_.IsRedoLogEmpty()) {
			return;
		}
		const current_data = data.MakeSaveData();
		this.logger_.PushUndoLog(current_data);
		const redo_data = this.logger_.PopRedoLog();
		this.CopyFromMultiLayerIndexColorBitmap(redo_data);
		layer_pane_ui.CreateBrandNewLayers(data.CreateLayerCreationParameters());
	}
}

const ApplyView = function (): void {
	color_table.SetColorTable(data.GetColorTable());
	if (canvas_ui !== null) {
		canvas_ui.canvas_width = data.edit_width;
		canvas_ui.canvas_height = data.edit_height;
	}
	return;
}

class RectangleTargetPixels {
	private left: number;
	private top: number;
	private right: number;
	private bottom: number;
	constructor(x1: number, y1: number, x2: number, y2: number) {
		this.Update(x1, y1, x2, y2);
	}
	public Update(x1: number, y1: number, x2: number, y2: number) {
		this.left = (x1 < x2) ? x1 : x2;
		this.right = (x1 < x2) ? x2 : x1;
		this.top = (y1 < y2) ? y1 : y2;
		this.bottom = (y1 < y2) ? y2 : y1;
	}
	public In(point: PixelPoint): boolean {
		const is_contain = (
			(this.left <= point.w) && (point.w <= this.right) &&
			(this.top <= point.h) && (point.h <= this.bottom));
		return is_contain;
	}
	public BrakedownToPixelMask(): void {
		data.SetMaskFlagsByRectangle(this.left, this.top, this.right, this.bottom, true);
	}
	public VerticalTurn(): void {
		const half_h = Number(Math.floor((this.bottom - this.top + 1) / 2));
		const max_h = this.top + half_h;
		for (let h1 = this.top, h2 = this.bottom; h1 < max_h; h1++, h2--) {
			for (let w = this.left; w <= this.right; w++) {
				const c1 = data.GetWrittenColorIndex(w, h1);
				const c2 = data.GetWrittenColorIndex(w, h2);
				data.WriteMap(w, h1, c2);
				data.WriteMap(w, h2, c1);
			}
		}
	}
	public HorizontalTurn(): void {
		const half_w = Number(Math.floor((this.right - this.left + 1) / 2));
		const max_w = this.left + half_w;
		for (let w1 = this.left, w2 = this.right; w1 < max_w; w1++, w2--) {
			for (let h = this.top; h <= this.bottom; h++) {
				const c1 = data.GetWrittenColorIndex(w1, h);
				const c2 = data.GetWrittenColorIndex(w2, h);
				data.WriteMap(w1, h, c2);
				data.WriteMap(w2, h, c1);
			}
		}
	}
	public Fill(): void {
		const current_color_index = data.selected_color_index;
		for (let h = this.top; h <= this.bottom; h++) {
			for (let w = this.left; w <= this.right; w++) {
				data.WriteMap(w, h, current_color_index);
			}
		}
	}
	public CopyToClipboard(): void {
		data.CopyToClipBoard(this.left, this.top, this.right, this.bottom);
	}
	public Paste(): void {
		data.PushUndoLog();
		data.PasteToCanvas(this.left, this.top);
	}
	public get rectangle(): { left: number, top: number, right: number, bottom: number } {
		return { left: this.left, top: this.top, right: this.right, bottom: this.bottom };
	}
}

const data: Data = new Data(default_edit_width, default_edit_height, max_edit_width, max_edit_height);
const marged_pixel_layer = new PixelLayer(0, "test", '#000000', max_edit_width, max_edit_height);
let canvas_ui: CanvasUi | null = null;
const canvas_tools = new CanvasTools.CanvasTools(
	(x, y) => {
		return !data.IsMasked(x, y);
	},
	(x, y) => {
		if (x < 0 || y < 0 || canvas_ui.canvas_width <= x || canvas_ui.canvas_height <= y) {
			return;
		}
		data.WriteMap(x, y, data.selected_color_index);
	},
	(x, y) => {
		return data.GetWrittenColorIndex(x, y);
	},
	() => {
		return [canvas_ui.canvas_width, canvas_ui.canvas_height];
	},
	() => {
		return canvas_ui.edit_scale;
	},
	(x, y) => {
		const color_index = data.GetWrittenColorIndex(x, y);
		ChengeCurrentColor(color_index);
	},
	(start_x, start_y, end_x, end_y) => {
		if (target_pixels === null) {
			target_pixels = new RectangleTargetPixels(start_x, start_y, end_x, end_y);
		} else {
			target_pixels.Update(start_x, start_y, end_x, end_y);
		}
	},
	() => { },
	() => {
		data.PushUndoLog();
	},
	() => { },
	() => { }
);

let layer_pane_ui: LayerPaneUi<PixelLayer> | null = null;
let target_pixels: RectangleTargetPixels | null = null;
let color_table: ColorPaletteTableUi | null = null;
let preview_window: PreviewWindowUi | null = null;
let animation_window: SpriteAnimationPreviewWindowUi | null = null;
let preview_tab_pane: TabPaneUi | null = null;

const MargeLayers = function (): void {
	const sorted_layers = data.GetDescendingOrderedLayers();
	const max_w = data.edit_width;
	const max_h = data.edit_height;
	const bg_ci = data.selected_bg_color_index;
	const lowest_layer_index = sorted_layers.length - 1;
	for (let h = 0; h < max_h; h++) {
		for (let w = 0; w < max_w; w++) {
			let is_written = false;
			const dst_ci = marged_pixel_layer.pixels[h][w];
			for (let i = 0; i < sorted_layers.length - 1; i++) {
				const source_layer = sorted_layers[i];
				if (source_layer.is_visible === false) {
					continue;
				}
				const src_ci = source_layer.pixels[h][w];
				if (src_ci !== bg_ci) {
					marged_pixel_layer.pixels[h][w] = src_ci;
					is_written = true;
					break;
				}
			}
			if (!is_written) {
				if (sorted_layers[lowest_layer_index].is_visible) {
					marged_pixel_layer.pixels[h][w] = sorted_layers[lowest_layer_index].pixels[h][w];
				} else {
					marged_pixel_layer.pixels[h][w] = bg_ci;
				}
			}
		}
	}
	return;
}

function GetHtmlElement<T extends HTMLElement>(element_id: string): T {
	return <T>document.getElementById(element_id);
}

const FitDivWidth = function (modify_div_id: string, referencet_div_id: string) {
	const new_width = GetHtmlElement<HTMLDivElement>(referencet_div_id).clientWidth;
	GetHtmlElement<HTMLDivElement>(modify_div_id).style.width = `${new_width}px`;
};
const FitDivHeight = function (modify_div_id: string, referencet_div_id: string) {
	const new_height = GetHtmlElement<HTMLDivElement>(referencet_div_id).clientHeight;
	GetHtmlElement<HTMLDivElement>(modify_div_id).style.height = `${new_height}px`;
};

const TryReadEditDataByJson = function (bytes: string) {
	const read_data = JSON.parse(bytes) as MultiLayerIndexColorBitmap;
	data.CopyFromMultiLayerIndexColorBitmap(read_data);
	layer_pane_ui.CreateBrandNewLayers(data.CreateLayerCreationParameters());
	ApplyView();
	return true;
}

const LoadEditData = function (bytes: string | ArrayBuffer) {
	const bmp_data = WindowsIndexColorBitmap.Deserialize(bytes as ArrayBuffer);
	if (bmp_data !== null) {
		const [color_palette, pixels, width, height] = bmp_data as [string[], number[][], number, number];
		const raw_data = new IndexColorBitmap(width, height, color_palette, pixels);
		data.CopyFromIndexColorBitmap(raw_data, dom.edit_data_name.value);
		layer_pane_ui.CreateBrandNewLayers(data.CreateLayerCreationParameters());
		ApplyView();
		return true;
	}
	const bs = Array.from(new Uint8Array(bytes as ArrayBuffer), (v) => String.fromCharCode(v)).join("");
	if (TryReadEditDataByJson(bs)) {
		return true;
	}
	return false;
}

class Dom {
	blank_frame: HTMLDivElement;
	edit_block: HTMLDivElement;
	edit_filepath: HTMLInputElement;
	large_grid_width: HTMLInputElement;
	large_grid_height: HTMLInputElement;
	dom_pen_tool: HTMLInputElement;
	dom_paint_tool: HTMLInputElement;
	dom_rectangle_select_tool: HTMLInputElement;
	grid_color: HTMLInputElement;
	edit_data_name: HTMLInputElement;
	undo_button: HTMLButtonElement;
	redo_button: HTMLButtonElement;
	rectangle_fill_button: HTMLButtonElement;
	h_turn_button: HTMLButtonElement;
	v_turn_button: HTMLButtonElement;
	break_to_mask_button: HTMLButtonElement;
	release_targetting_button: HTMLButtonElement;
	turn_mask_button: HTMLButtonElement;
	delete_mask_button: HTMLButtonElement;
	delete_all_unused_colors_button: HTMLButtonElement;
	Initialize() {
		this.blank_frame = GetHtmlElement<HTMLDivElement>('blank_frame');
		this.edit_block = GetHtmlElement<HTMLDivElement>('editblock');
		this.edit_filepath = GetHtmlElement<HTMLInputElement>('edit_filepath');
		this.large_grid_width = GetHtmlElement<HTMLInputElement>('large_grid_width');
		this.large_grid_height = GetHtmlElement<HTMLInputElement>('large_grid_height');
		this.dom_pen_tool = GetHtmlElement<HTMLInputElement>('pen_tool');
		this.dom_paint_tool = GetHtmlElement<HTMLInputElement>('paint_tool');
		this.dom_rectangle_select_tool = GetHtmlElement<HTMLInputElement>('rectangle_select_tool');
		this.grid_color = GetHtmlElement<HTMLInputElement>('grid_color');
		this.edit_data_name = GetHtmlElement<HTMLInputElement>('edit_data_name');
		this.undo_button = GetHtmlElement<HTMLButtonElement>('undo_button');
		this.redo_button = GetHtmlElement<HTMLButtonElement>('redo_button');
		this.rectangle_fill_button = GetHtmlElement<HTMLButtonElement>('rectangle_fill_button');
		this.h_turn_button = GetHtmlElement<HTMLButtonElement>('h_turn_button');
		this.v_turn_button = GetHtmlElement<HTMLButtonElement>('v_turn_button');
		this.break_to_mask_button = GetHtmlElement<HTMLButtonElement>('break_to_mask_button');
		this.release_targetting_button = GetHtmlElement<HTMLButtonElement>('release_targetting_button');
		this.turn_mask_button = GetHtmlElement<HTMLButtonElement>('turn_mask_button');
		this.delete_mask_button = GetHtmlElement<HTMLButtonElement>('delete_mask_button');
		this.delete_all_unused_colors_button = GetHtmlElement<HTMLButtonElement>('delete_all_unused_colors_button');
	}
}

const dom = new Dom();

var frame_count = 0;
const UpdateView = function () {
	MargeLayers();
	layer_pane_ui.Draw();
	const color_table = data.GetColorTable();
	if (preview_window !== null) {
		preview_window.Draw(marged_pixel_layer.pixels, color_table, data.edit_width, data.edit_height);
	}
	if (animation_window !== null) {
		animation_window.Draw(marged_pixel_layer.pixels, color_table, data.edit_width, data.edit_height, frame_count);
	}
	if (canvas_ui !== null) {
		canvas_ui.Draw(
			marged_pixel_layer.pixels, data.pixels_mask, color_table,
			dom.grid_color.value,
			dom.large_grid_width.valueAsNumber, dom.large_grid_height.valueAsNumber, large_grid_color,
			((target_pixels !== null) ? target_pixels.rectangle : null),
			frame_count);
	}
	frame_count++;
	window.requestAnimationFrame(UpdateView);
}

const ChengeCurrentColor = function (new_color_index: number): void {
	data.selected_color_index = new_color_index;
	color_table.SelectColorCell(new_color_index);
}

const AutoSave = function () {
	if (Browser.isStorageAvailable('localStorage')) {
		window.localStorage.setItem('data', JSON.stringify(data.MakeSaveData()));
	}
}
const AutoLoad = function (): boolean {
	if (Browser.isStorageAvailable('localStorage') == false) {
		return false;
	}
	const data_json = window.localStorage.getItem('data') as string | null;
	if (data_json === null) {
		return false;
	}
	const load_data = JSON.parse(data_json) as MultiLayerIndexColorBitmap;
	if (('format_version' in load_data) == false) {
		window.localStorage.removeItem('data');
		return false;
	}
	if (load_data.format_version !== data_format_version) {
		window.localStorage.removeItem('data');
		return false;
	}
	data.CopyFromMultiLayerIndexColorBitmap(load_data);
	return true;
}

function Initialize() {
	dom.Initialize();
	const edit_reader: FileReader = new FileReader();
	dom.edit_filepath.addEventListener('change', (event) => {
		edit_reader.readAsArrayBuffer((<HTMLInputElement>event.target).files[0]);
	})
	dom.dom_pen_tool.addEventListener('change', (event) => {
		canvas_tools.tool_kind = "pen";
	});
	dom.dom_paint_tool.addEventListener('change', (event) => {
		canvas_tools.tool_kind = "paint";
	});
	dom.dom_rectangle_select_tool.addEventListener('change', (event) => {
		canvas_tools.tool_kind = "rectangle_select";
	});
	const dl_button = new DonwloadButton(
		GetHtmlElement<HTMLDivElement>("edit_command"), "保存（ダウンロード）", () => {
			const basename = dom.edit_data_name.value;
			const save_format = GetHtmlElement<HTMLSelectElement>('edit_save_format').value;
			return MakeSaveData(basename, save_format)
		});
	edit_reader.addEventListener('load', (event) => {
		const basename = Misc.ExtractBaseName(dom.edit_filepath.value);
		dom.edit_data_name.value = basename;
		LoadEditData((<FileReader>event.target).result);
	});

	let creation_count = 0;
	const MakeLayerDefaultName = function (): [string, string] {
		const hue = (creation_count * 79) % 360;
		const color = new RgbColor(...Misc.HsvToRgb(hue, 0.375, 0.75))
		const name = `new layer #${creation_count}`;
		creation_count++;
		return [name, color.ToHexColor()];
	}
	color_table = new ColorPaletteTableUi(
		16, 16, 16,
		0,
		[
			{ caption: "HSV 16色", colors: Misc.MakeHSVBalancedColorList(1) },
			{ caption: "HSV 16色2彩度", colors: Misc.MakeHSVBalancedColorList(2) },
			{ caption: "HSV 16色4彩度", colors: Misc.MakeHSVBalancedColorList(4) },
			{ caption: "Webセーフカラー", colors: Misc.MakeWebSafeColorList() },
		],
		(color_index) => {
			data.selected_color_index = color_index;
		},
		(src_i, src_cc, dst_i, dst_cc) => {
			data.SwapColor(src_i, dst_i);
		},
		(color_index, color_string) => {
			data.GetRgbColorFromPalette(color_index).SetHexColor(color_string);
		}
	);
	document.getElementById("colorpalette").appendChild(color_table.node);
	if (!AutoLoad()) {
		data.RemoveAllLayers();
		const pixel_layer = new PixelLayer(0, ...MakeLayerDefaultName(), max_edit_width, max_edit_height);
		data.AppendLayer(pixel_layer);
	}
	ApplyView();
	if (canvas_ui === null) {
		canvas_ui = new CanvasUi(data.edit_width, data.edit_height, (width, height) => {
			data.edit_width = width;
			data.edit_height = height;
		});
		canvas_ui.edit_scale = default_edit_scale;
	}
	canvas_tools.Attach(canvas_ui.canvas);
	dom.edit_block.appendChild(canvas_ui.node);


	dom.undo_button.addEventListener('click', (event) => {
		data.Undo();
		ApplyView();
	});
	dom.redo_button.addEventListener('click', (event) => {
		data.Redo();
		ApplyView();
	});
	dom.rectangle_fill_button.addEventListener('click', (event) => {
		if (target_pixels !== null) {
			data.PushUndoLog();
			target_pixels.Fill();
		}
	});
	dom.v_turn_button.addEventListener('click', (event) => {
		if (target_pixels !== null) {
			target_pixels.VerticalTurn();
		}
	});
	dom.h_turn_button.addEventListener('click', (event) => {
		if (target_pixels !== null) {
			target_pixels.HorizontalTurn();
		}
	});
	dom.break_to_mask_button.addEventListener('click', (event) => {
		if (target_pixels !== null) {
			target_pixels.BrakedownToPixelMask();
		}
	});
	dom.release_targetting_button.addEventListener('click', (event) => {
		target_pixels = null;
	});
	dom.turn_mask_button.addEventListener('click', (event) => {
		data.TurnMask();
	});
	dom.delete_mask_button.addEventListener('click', (event) => {
		data.SetMaskFlagsByRectangle(0, 0, data.edit_width, data.edit_height, false);
	});
	dom.delete_all_unused_colors_button.addEventListener('click', (event) => {
		data.DeleteAllUnusedColors();
		color_table.SetColorTable(data.GetColorTable());
	});
	const layers = document.getElementById("layerblock");
	layer_pane_ui = new LayerPaneUi<PixelLayer>(
		(order) => {
			const param = MakeLayerDefaultName();
			const new_pixel_layer = new PixelLayer(order, ...param, max_edit_width, max_edit_height);
			data.AppendLayer(new_pixel_layer);
			return [...param, new_pixel_layer];
		},
		(pixel_layer, order) => {
			data.RemoveLayer(pixel_layer);
		},
		(lh_order, rh_order) => { /* swaped callback */ },
		(pixel_layer, order, name, tag_color, is_locked, is_visible, is_focusin, is_focusout, thumbnail_context) => {
			pixel_layer.order = order;
			pixel_layer.name = name;
			pixel_layer.is_locked = is_locked;
			pixel_layer.is_visible = is_visible;
			if (is_focusin === true) {
				data.SetCurrentPixelLayer(pixel_layer);
				dom.edit_block.style.backgroundColor = tag_color;
				canvas_ui.node.style.backgroundColor = tag_color;
			}
			if (data.IsCurrentPixelLayer(pixel_layer)) {
				if (canvas_ui !== null) {
					if (is_locked) {
						canvas_ui.canvas.style.cursor = 'not-allowed';
					} else {
						canvas_ui.canvas.style.cursor = 'auto';
					}
				}
			}
		},
		(value, order, is_locked, is_visible, thumbnail_context) => {
			thumbnail_context.scale(1, 1);
			thumbnail_context.fillStyle = '#000000';
			thumbnail_context.fillRect(0, 0, 16, 16);
			if (is_locked) {
				thumbnail_context.moveTo(0.5, 0.5);
				thumbnail_context.lineTo(15.5, 15.5);
				thumbnail_context.lineWidth = 3;
				thumbnail_context.strokeStyle = '#ff0000';
				thumbnail_context.stroke();
			}
		});
	layers.appendChild(layer_pane_ui.node);
	layer_pane_ui.CreateBrandNewLayers(data.CreateLayerCreationParameters());
	preview_tab_pane = new TabPaneUi();
	preview_window = new PreviewWindowUi(data.edit_width, data.edit_height);
	animation_window = new SpriteAnimationPreviewWindowUi(16, 16);
	preview_window.node.style.backgroundColor = "darkgoldenrod";
	animation_window.node.style.backgroundColor = "olive";
	preview_tab_pane.AddTab(preview_window.node, "プレビュー");
	preview_tab_pane.AddTab(animation_window.node, "アニメ");
	document.getElementById("viewblock").appendChild(preview_tab_pane.node);
	window.addEventListener('keydown', (event: KeyboardEvent) => {
		if (event.ctrlKey) {
			switch (event.key) {
				case 's': AutoSave(); break;
				case 'z': data.Undo(); ApplyView(); break;
				case 'y': data.Redo(); ApplyView(); break;
				case 'd': target_pixels = null; break;
				case 'c':
					if (!!target_pixels) {
						target_pixels.CopyToClipboard();
					}
					break;
				case 'v':
					if (!!target_pixels) {
						target_pixels.Paste();
					} else {
						data.PushUndoLog();
						data.PasteToCanvas(0, 0);
					}
					break;
			}
		}
	})

	window.requestAnimationFrame(UpdateView);
}

const MakeSaveDataBlobAsWindowsIndexColorBitmap = function (save_data: MultiLayerIndexColorBitmap) {
	const index_bmp = save_data.Marge();
	const bmp_bytes = WindowsIndexColorBitmap.Serialize(index_bmp.color_palette, index_bmp.pixels, index_bmp.width, index_bmp.height);
	const save_data_blob = new Blob([bmp_bytes]);
	return save_data_blob;
};

const MakeSaveDataBlobAsJson = function (save_data: MultiLayerIndexColorBitmap) {
	const save_data_json = JSON.stringify(save_data);
	const save_data_blob = new Blob([save_data_json], {
		type: 'application/json'
	});
	return save_data_blob;
};

const MakeSaveData = function (basename: string, save_format: string): [string, Blob] {
	switch (save_format) {
		case "WindowsIndexColorBitmap":
			return [`${basename}.bmp`, MakeSaveDataBlobAsWindowsIndexColorBitmap(data.MakeSaveData())];
		case "JSON":
		default:
			return [`${basename}.json`, MakeSaveDataBlobAsJson(data.MakeSaveData())];
	}
};

Initialize();
