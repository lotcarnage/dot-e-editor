/// <reference path="./windows_bitmap.ts" />
/// <reference path="./misc.ts" />
/// <reference path="./browser.ts" />
/// <reference path="./ui_parts.ts" />

class RgbColor {
	r: number;
	g: number;
	b: number;
	public constructor(r = 0, g = 0, b = 0) {
		this.r = r;
		this.g = g;
		this.b = b;
	}
	public ToHexColor(): string {
		const r_hex = ('00' + this.r.toString(16)).slice(-2);
		const g_hex = ('00' + this.g.toString(16)).slice(-2);
		const b_hex = ('00' + this.b.toString(16)).slice(-2);
		return `#${r_hex}${g_hex}${b_hex}`;
	}
	public ToRgbString(): string {
		return `rgb(${this.r},${this.g},${this.b})`;
	}
	public SetHexColor(hex_color: string): boolean {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex_color);
		if (result) {
			this.r = parseInt(result[1], 16);
			this.g = parseInt(result[2], 16);
			this.b = parseInt(result[3], 16);
		}
		return !!(result);
	}
	public SetRgbString(rgb_string: string): boolean {
		const result = /^rgb\s*\(\s*([\d]+)\s*,\s*([\d]+)\s*,\s*([\d]+)\s*\)/i.exec(rgb_string);
		if (result) {
			this.r = Number(result[1]);
			this.g = Number(result[2]);
			this.b = Number(result[3]);
		}
		return !!(result);
	}
	public SetColorString(color_string: string): boolean {
		return this.SetHexColor(color_string) ? true : this.SetRgbString(color_string);
	}
}

class PixelPoint {
	public w: number;
	public h: number;
	public constructor(w: number, h: number) {
		this.w = w;
		this.h = h;
	}
	ToIndex(width: number): number {
		return width * this.h + this.w;
	}
	static IndexToPixelPoint(index: number, width: number): PixelPoint {
		const w = Math.floor(index % width);
		const h = Math.floor(index / width);
		return new PixelPoint(w, h);
	}
	static IndexToPixelPointW(index: number, width: number): number {
		return Math.floor(index % width);
	}
	static IndexToPixelPointH(index: number, width: number): number {
		return Math.floor(index / width);
	}
}

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
}

const MargeMultiLayerIndexColorBitmapToIndexBitmap = function (mlbmp: MultiLayerIndexColorBitmap) {
	const num_layers = mlbmp.layers.length;
	const sorted_layers = new Array<IndexColorBitmapLayer>(num_layers);
	for (let layer of mlbmp.layers) {
		sorted_layers[num_layers - layer.order - 1] = layer;
	}
	const default_bg_color = 0;
	const max_w = mlbmp.width;
	const max_h = mlbmp.height;
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
		color_palette[i] = mlbmp.color_palette[i].ToRgbString();
	}
	return new IndexColorBitmap(max_w, max_h, color_palette, marged_pixels);
}


class PixelLayer {
	private pixels_: number[][];
	private order_: number;
	private name_: string;
	is_visible: boolean;
	is_locked: boolean;
	tag_color: string;
	constructor(order: number, name: string, tag_color: string, max_width: number, max_height: number) {
		this.pixels_ = Misc.Make2dArray<number>(max_width, max_height, 0);
		this.order_ = order;
		this.name_ = name;
		this.tag_color = tag_color;
		this.is_locked = false;
		this.is_locked = true;
	}
	public WritePixel(x: number, y: number, color_index: number) {
		this.pixels_[y][x] = color_index;
	}
	public GetPixel(x: number, y: number): number {
		return this.pixels_[y][x];
	}
	public get order(): number {
		return this.order_;
	}
	public set order(new_order: number) {
		this.order_ = new_order;
	}
	public get name(): string {
		return this.name_;
	}
	public set name(new_name: string) {
		this.name_ = new_name;
	}
	public get pixels(): number[][] {
		return this.pixels_;
	}
}

class Data {
	private pixel_layer_: PixelLayer | null;
	private pixels_written_set_: Set<number>;
	private pixels_mask_: boolean[][];
	private edit_scale_: number;
	private edit_width_: number;
	private edit_height_: number;
	private is_edit_view_touched_: boolean;
	private selected_color_index_: number;
	private color_palette_: RgbColor[];
	private logger_: EditLogger;
	private pixels_clipboard_: number[][];
	private clipboard_stored_width_: number;
	private clipboard_stored_height_: number;
	private selected_bg_color_index_: number;
	public constructor(default_width: number, default_height: number, max_width: number, max_height: number) {
		this.edit_width_ = default_width;
		this.edit_height_ = default_height;
		this.pixel_layer_ = null;
		this.pixels_clipboard_ = Misc.Make2dArray<number>(max_width, max_height, 0);
		this.clipboard_stored_width_ = 0;
		this.clipboard_stored_height_ = 0;
		this.pixels_written_set_ = new Set<number>();
		this.pixels_mask_ = Misc.Make2dArray<boolean>(max_width, max_height, false);
		this.selected_color_index_ = 0;
		this.selected_bg_color_index_ = 0;
		this.color_palette_ = new Array<RgbColor>(256);
		for (let i = 0; i < 256; i++) {
			this.color_palette_[i] = new RgbColor();
		}
		this.logger_ = new EditLogger();
	}
	public SetCurrentPixelLayer(pixel_layer: PixelLayer): void {
		this.pixel_layer_ = pixel_layer;
	}
	public get edit_scale(): number {
		return this.edit_scale_;
	}
	public set edit_scale(new_scale: number) {
		this.edit_scale_ = new_scale;
		this.is_edit_view_touched_ = true;
	}
	public get edit_width(): number {
		return this.edit_width_;
	}
	public set edit_width(new_width: number) {
		this.edit_width_ = new_width;
		this.is_edit_view_touched_ = true;
	}
	public get edit_height(): number {
		return this.edit_height_;
	}
	public set edit_height(new_height: number) {
		this.edit_height_ = new_height;
		this.is_edit_view_touched_ = true;
	}
	public get selected_color_index(): number {
		return this.selected_color_index_;
	}
	public set selected_color_index(new_index: number) {
		this.selected_color_index_ = new_index;
	}
	public get is_edit_view_touched(): boolean {
		return this.is_edit_view_touched_;
	}
	public get selected_bg_color_index(): number {
		return this.selected_bg_color_index_;
	}
	public TouchEditView(): void {
		this.is_edit_view_touched_ = true;
	}
	public ClearEditViewTouchedFlag(): void {
		this.is_edit_view_touched_ = false;
	}
	public SetMaskFlagsByRectangle(left: number, top: number, right: number, bottom: number, flag: boolean): void {
		for (let h = top; h <= bottom; h++) {
			for (let w = left; w <= right; w++) {
				this.pixels_mask_[h][w] = flag;
				this.TouchPixel(w, h);
			}
		}
	}
	public TurnMask(): void {
		for (let h = 0; h < this.edit_height_; h++) {
			for (let w = 0; w < this.edit_width_; w++) {
				this.pixels_mask_[h][w] = !this.pixels_mask_[h][w];
				this.TouchPixel(w, h);
			}
		}
	}
	public IsMasked(w: number, h: number): boolean {
		return this.pixels_mask_[h][w];
	}
	public WriteMap(w: number, h: number, color_index: number) {
		if (this.IsMasked(w, h)) {
			return;
		}
		if (this.pixel_layer_.is_locked === true) {
			return;
		}
		this.pixel_layer_.WritePixel(w, h, color_index);
		const pixel_index = this.edit_width_ * h + w;
		this.pixels_written_set_.add(pixel_index);
	}
	public TouchPixel(w: number, h: number): void {
		const pixel_index = this.edit_width_ * h + w;
		this.pixels_written_set_.add(pixel_index);
	}
	public GetWrittenColorIndex(w: number, h: number): number {
		return this.pixel_layer_.GetPixel(w, h);
	}
	public GetWrittenPixelSet(): Set<number> {
		return this.pixels_written_set_;
	}
	public SetRgbColorToPalette(index: number, color: RgbColor) {
		this.color_palette_[index].r = color.r;
		this.color_palette_[index].g = color.g;
		this.color_palette_[index].b = color.b;
	}
	public GetRgbColorFromPalette(index: number): RgbColor {
		return this.color_palette_[index];
	}
	public DeleteAllUnusedColors(): void {
		const histogram = new Array<number>(256).fill(0);
		for (let h = 0; h < this.edit_height_; h++) {
			for (let w = 0; w < this.edit_width_; w++) {
				histogram[this.pixel_layer_.GetPixel(w, h)]++;
			}
		}
		for (let i = 0; i < 256; i++) {
			if (histogram[i] === 0) {
				data.color_palette_[i].r = 0;
				data.color_palette_[i].g = 0;
				data.color_palette_[i].b = 0;
			}
		}
	}
	public SwapColor(lh_index: number, rh_index: number): void {
		if (lh_index === rh_index) {
			return;
		}
		for (let h = 0; h < this.edit_height_; h++) {
			for (let w = 0; w < this.edit_width_; w++) {
				const color_index = this.pixel_layer_.GetPixel(w, h);
				if (color_index === lh_index) {
					this.pixel_layer_.WritePixel(w, h, rh_index);
					this.TouchPixel(w, h);
				}
				if (color_index === rh_index) {
					this.pixel_layer_.WritePixel(w, h, lh_index);
					this.TouchPixel(w, h);
				}
			}
		}
		const tmp_color = this.color_palette_[lh_index];
		this.color_palette_[lh_index] = this.color_palette_[rh_index];
		this.color_palette_[rh_index] = tmp_color;
		return;
	}
	public MakeSaveData(): MultiLayerIndexColorBitmap {
		const edit_w_count = this.edit_width_;
		const edit_h_count = this.edit_height_;
		const save_pixels = new Array<number[]>(edit_h_count);
		for (var h = 0; h < edit_h_count; h++) {
			save_pixels[h] = this.pixel_layer_.pixels[h].slice(0, edit_w_count);
		}
		const color_palette = new Array<RgbColor>(256);
		for (var i = 0; i < 256; i++) {
			color_palette[i] = this.color_palette_[i];
		}
		const save_data = new MultiLayerIndexColorBitmap();
		save_data.width = edit_w_count;
		save_data.height = edit_h_count;
		save_data.color_palette = color_palette;
		save_data.layers = new Array<IndexColorBitmapLayer>(0);
		for (let layer of pixel_layers.values()) {
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
			this.color_palette_[i].SetRgbString(bmp_data.color_palette[i]);
		}
		pixel_layers.clear();
		const layer = new PixelLayer(0, name, '#202020', max_edit_width, max_edit_height);
		for (let h = 0; h < edit_h; h++) {
			for (let w = 0; w < edit_w; w++) {
				layer.pixels[h][w] = bmp_data.pixels[h][w];
			}
		}
		pixel_layers.set(layer, layer);
		return;
	}
	public CopyFromMultiLayerIndexColorBitmap(raw_data: MultiLayerIndexColorBitmap) {
		const edit_w = raw_data.width;
		const edit_h = raw_data.height;
		this.edit_width_ = edit_w;
		this.edit_height_ = edit_h;
		for (let i = 0; i < 256; i++) {
			this.color_palette_[i].r = raw_data.color_palette[i].r;
			this.color_palette_[i].g = raw_data.color_palette[i].g;
			this.color_palette_[i].b = raw_data.color_palette[i].b;
		}
		pixel_layers.clear();
		for (let raw_layer of raw_data.layers) {
			const layer = new PixelLayer(raw_layer.order, raw_layer.name, raw_layer.tag_color, max_edit_width, max_edit_height);
			for (let h = 0; h < edit_h; h++) {
				for (let w = 0; w < edit_w; w++) {
					layer.pixels[h][w] = raw_layer.pixels[h][w];
				}
			}
			pixel_layers.set(layer, layer);
		}
		return;
	}
	public ApplyView(): void {
		ApplyLayerUi();
		this.TouchEditView();
	}

	public CopyToClipBoard(left: number, top: number, right: number, bottom: number): void {
		const copy_w = right - left + 1;
		const copy_h = bottom - top + 1;
		for (let dst_h = 0; dst_h < copy_h; dst_h++) {
			const src_h = top + dst_h;
			for (let dst_w = 0; dst_w < copy_w; dst_w++) {
				const src_w = left + dst_w;
				this.pixels_clipboard_[dst_h][dst_w] = this.pixel_layer_.GetPixel(src_w, src_h);
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
		this.ApplyView();
	}
	public Redo() {
		if (this.logger_.IsRedoLogEmpty()) {
			return;
		}
		const current_data = data.MakeSaveData();
		this.logger_.PushUndoLog(current_data);
		const redo_data = this.logger_.PopRedoLog();
		this.CopyFromMultiLayerIndexColorBitmap(redo_data);
		this.ApplyView();
	}
}

const ApplyColorPalette = function (): void {
	for (let i = 0; i < 256; i++) {
		dom.color_palette[i].style.backgroundColor = data.GetRgbColorFromPalette(i).ToRgbString();
	}
}

const ApplyView = function (): void {
	ApplyColorPalette();
	dom.editwidth.value = data.edit_width.toString();
	dom.editheight.value = data.edit_height.toString();
	return;
}

class RectangleTargetPixels {
	private left: number;
	private top: number;
	private right: number;
	private bottom: number;
	constructor(point1: PixelPoint, point2: PixelPoint) {
		this.Update(point1, point2);
	}
	public Update(point1: PixelPoint, point2: PixelPoint) {
		this.left = (point1.w < point2.w) ? point1.w : point2.w;
		this.right = (point1.w < point2.w) ? point2.w : point1.w;
		this.top = (point1.h < point2.h) ? point1.h : point2.h;
		this.bottom = (point1.h < point2.h) ? point2.h : point1.h;
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
	public Draw(canvas_context: CanvasRenderingContext2D, view_scale: number, frame_count: number, hex_color: string) {
		const dot_span = 5;
		const edit_context = dom.edit_canvas.getContext("2d");
		edit_context.scale(1, 1);
		canvas_context = edit_context;
		let z = this.left + (frame_count % dot_span);
		canvas_context.fillStyle = hex_color;
		for (; z <= this.right; z += dot_span) {
			canvas_context.fillRect(z, this.top, 1, 1);
			data.TouchPixel(z, this.top);
		}
		z = z - this.right + this.top;
		for (; z <= this.bottom; z += dot_span) {
			canvas_context.fillRect(this.right, z, 1, 1);
			data.TouchPixel(this.right, z);
		}
		z = this.right - (z - this.bottom);
		for (; this.left <= z; z -= dot_span) {
			canvas_context.fillRect(z, this.bottom, 1, 1);
			data.TouchPixel(z, this.bottom);
		}
		z = this.bottom - (this.left - z);
		for (; this.top <= z; z -= dot_span) {
			canvas_context.fillRect(this.left, z, 1, 1);
			data.TouchPixel(this.left, z);
		}
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
}

class Tool {
	public LeftButtonDown(pixel_w: number, pixel_h: number) { };
	public LeftButtonUp(pixel_w: number, pixel_h: number) { };
	public RightButtonDown(pixel_w: number, pixel_h: number) { };
	public RightButtonUp(pixel_w: number, pixel_h: number) { };
	public MouseMove(pixel_w: number, pixel_h: number) { };
	public MouseOut(pixel_w: number, pixel_h: number) { };
}

class PenTool extends Tool {
	private is_activated: boolean = false;
	private last_point_w: number;
	private last_point_h: number;
	private WritePixel = function (x: number, y: number): void {
		if (x < 0 || y < 0 || data.edit_width <= x || data.edit_height <= y) {
			return;
		}
		data.WriteMap(x, y, data.selected_color_index);
	}
	public LeftButtonDown(pixel_w: number, pixel_h: number) {
		data.PushUndoLog();
		data.WriteMap(pixel_w, pixel_h, data.selected_color_index);
		this.last_point_w = pixel_w;
		this.last_point_h = pixel_h;
		this.is_activated = true;
		return;
	};
	public LeftButtonUp(pixel_w: number, pixel_h: number) {
		this.is_activated = false;
	}
	public RightButtonDown(pixel_w: number, pixel_h: number) {
		const color_index = data.GetWrittenColorIndex(pixel_w, pixel_h);
		ChengeCurrentColor(color_index);
		return;
	};
	public MouseMove(pixel_w: number, pixel_h: number) {
		if (this.is_activated) {
			Misc.LineTo2d(this.last_point_w, this.last_point_h, pixel_w, pixel_h, this.WritePixel);
		}
		this.last_point_w = pixel_w;
		this.last_point_h = pixel_h;
		this.is_activated = true;
		return;
	};
	public MouseOut(pixel_w: number, pixel_h: number) {
		if (this.is_activated) {
			Misc.LineTo2d(this.last_point_w, this.last_point_h, pixel_w, pixel_h, this.WritePixel);
		}
		this.is_activated = false;
	};
}


const ExtractRegionPixelSet = function (start_point: PixelPoint): Set<number> {
	const min_w: 0 = 0;
	const min_h: 0 = 0;
	const max_w: number = data.edit_width;
	const max_h: number = data.edit_height;
	const region_pixels = new Set<number>();
	const next_pixel_queue: PixelPoint[] = new Array<PixelPoint>();
	const target_color_index: number = data.GetWrittenColorIndex(start_point.w, start_point.h);
	region_pixels.add(start_point.ToIndex(max_w));
	next_pixel_queue.push(start_point);
	const AddPixelToRegion = function (new_point: PixelPoint) {
		if (data.GetWrittenColorIndex(new_point.w, new_point.h) !== target_color_index) {
			return;
		}
		if (region_pixels.has(new_point.ToIndex(max_w))) {
			return;
		}
		next_pixel_queue.push(new_point);
		region_pixels.add(new_point.ToIndex(max_w));
		return;
	}
	for (; ;) {
		if (next_pixel_queue.length === 0) {
			break;
		}
		let pixel = next_pixel_queue.shift();
		if (min_h < pixel.h) {
			if (!data.IsMasked(pixel.w + 0, pixel.h - 1)) {
				AddPixelToRegion(new PixelPoint(pixel.w + 0, pixel.h - 1));
			}
		}
		if (min_w < pixel.w) {
			if (!data.IsMasked(pixel.w - 1, pixel.h + 0)) {
				AddPixelToRegion(new PixelPoint(pixel.w - 1, pixel.h + 0));
			}
		}
		if (pixel.w < max_w - 1) {
			if (!data.IsMasked(pixel.w + 1, pixel.h + 0)) {
				AddPixelToRegion(new PixelPoint(pixel.w + 1, pixel.h + 0));
			}
		}
		if (pixel.h < max_h - 1) {
			if (!data.IsMasked(pixel.w + 0, pixel.h + 1)) {
				AddPixelToRegion(new PixelPoint(pixel.w + 0, pixel.h + 1));
			}
		}
	}
	return region_pixels;
};


class PaintTool extends Tool {
	public LeftButtonDown(pixel_w: number, pixel_h: number) {
		data.PushUndoLog();
		const selected_pixel = new PixelPoint(pixel_w, pixel_h);
		const new_color_index = data.selected_color_index;
		const region_pixel_set = ExtractRegionPixelSet(selected_pixel);
		const max_w = data.edit_width;
		region_pixel_set.forEach((pixel_index) => {
			const w = PixelPoint.IndexToPixelPointW(pixel_index, max_w);
			const h = PixelPoint.IndexToPixelPointH(pixel_index, max_w);
			data.WriteMap(w, h, new_color_index);
		});
	};
	public RightButtonDown(pixel_w: number, pixel_h: number) {
		const color_index = data.GetWrittenColorIndex(pixel_w, pixel_h);
		ChengeCurrentColor(color_index);
	};
}

class RectangleSelectTool extends Tool {
	private start_point: PixelPoint | null;
	constructor() {
		super();
		this.start_point = null;
	}
	public LeftButtonDown(pixel_w: number, pixel_h: number) {
		this.start_point = new PixelPoint(pixel_w, pixel_h);
		if (target_pixels !== null) {
			target_pixels.Update(this.start_point, this.start_point);
		} else {
			target_pixels = new RectangleTargetPixels(this.start_point, this.start_point);
		}
	};
	public MouseMove(pixel_w: number, pixel_h: number) {
		const point = new PixelPoint(pixel_w, pixel_h);
		if (target_pixels !== null && this.start_point !== null) {
			target_pixels.Update(this.start_point, point);
		} else {
			this.start_point = point;
			target_pixels.Update(this.start_point, this.start_point);
		}
		return;
	};
}

const data: Data = new Data(default_edit_width, default_edit_height, max_edit_width, max_edit_height);
const pixel_layers = new Map<PixelLayer, PixelLayer>();
const marged_pixel_layer = new PixelLayer(0, "test", '#000000', max_edit_width, max_edit_height);
const pen_tool: PenTool = new PenTool();
const paint_tool: PaintTool = new PaintTool();
const rentangle_select_tool: RectangleSelectTool = new RectangleSelectTool();
let layer_pane_ui: UiParts.LayerPaneUi<PixelLayer> | null = null;
let tool: Tool = pen_tool;
let target_pixels: RectangleTargetPixels | null = null;

const MargeLayers = function (): void {
	const num_layers = pixel_layers.size;
	const sorted_layers = new Array<PixelLayer>(num_layers);
	for (let layer of pixel_layers.values()) {
		sorted_layers[num_layers - layer.order - 1] = layer;
	}
	const max_w = data.edit_width;
	const max_h = data.edit_height;
	const bg_ci = data.selected_bg_color_index;
	const lowest_layer_index = sorted_layers.length - 1;
	for (let h = 0; h < max_h; h++) {
		for (let w = 0; w < max_w; w++) {
			let is_written = false;
			const dst_ci = marged_pixel_layer.GetPixel(w, h);
			for (let i = 0; i < sorted_layers.length - 1; i++) {
				const source_layer = sorted_layers[i];
				if (source_layer.is_visible === false) {
					continue;
				}
				const src_ci = source_layer.GetPixel(w, h);
				if (src_ci !== bg_ci) {
					if (src_ci !== dst_ci) {
						marged_pixel_layer.WritePixel(w, h, src_ci);
						data.TouchPixel(w, h);
					}
					is_written = true;
					break;
				}
			}
			if (!is_written) {
				const src_ci = sorted_layers[lowest_layer_index].GetPixel(w, h);
				if (src_ci !== dst_ci) {
					marged_pixel_layer.WritePixel(w, h, src_ci);
					data.TouchPixel(w, h);
				}
			}
		}
	}
	return;
}

function GetHtmlElement<T extends HTMLElement>(element_id: string): T {
	return <T>document.getElementById(element_id);
}
const GetPixelPoint = function (event: MouseEvent, block_size: number): [number, number] {
	const rect: DOMRect = (<HTMLCanvasElement>event.target).getBoundingClientRect();
	const w: number = Math.floor((event.clientX - rect.left) / block_size);
	const h: number = Math.floor((event.clientY - rect.top) / block_size);
	return [w, h];
};
const GetTouchPixelPoint = function (event: TouchEvent, block_size: number): [number, number] {
	const rect: DOMRect = (<HTMLCanvasElement>event.target).getBoundingClientRect();
	const w: number = Math.floor((event.touches[0].clientX - rect.left) / block_size);
	const h: number = Math.floor((event.touches[0].clientY - rect.top) / block_size);
	return [w, h];
};

const MouseDownCallback = function (event: MouseEvent) {
	if (event.button === 0) {
		tool.LeftButtonDown(...GetPixelPoint(event, data.edit_scale));
	} else if (event.button === 2) {
		tool.RightButtonDown(...GetPixelPoint(event, data.edit_scale));
	}
};

const MouseUpCallback = function (event: MouseEvent) {
	if (event.button === 0) {
		tool.LeftButtonUp(...GetPixelPoint(event, data.edit_scale));
	} else if (event.button === 2) {
		tool.RightButtonUp(...GetPixelPoint(event, data.edit_scale));
	}
};

const MouseMoveCallback = function (event: MouseEvent) {
	if (event.buttons === 0x01) {
		tool.MouseMove(...GetPixelPoint(event, data.edit_scale));
	}
};

const MouseOutCallback = function (event: MouseEvent) {
	if (event.buttons === 0x01) {
		tool.MouseOut(...GetPixelPoint(event, data.edit_scale));
	}
};

const TouchStartCallback = function (event: TouchEvent) {
	if (event.touches.length === 1) {
		tool.LeftButtonDown(...GetTouchPixelPoint(event, data.edit_scale));
	}
};

const TouchEndCallback = function (event: TouchEvent) {
	if (event.touches.length === 1) {
		tool.LeftButtonUp(...GetTouchPixelPoint(event, data.edit_scale));
	}
};

const TouchMoveCallback = function (event: TouchEvent) {
	if (event.touches.length === 1) {
		tool.MouseMove(...GetTouchPixelPoint(event, data.edit_scale));
	}
	event.preventDefault();
};


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
	data.ApplyView();
	ApplyView();
	return true;
}

const LoadEditData = function (bytes: string | ArrayBuffer) {
	const bmp_data = WindowsIndexColorBitmap.Deserialize(bytes as ArrayBuffer);
	if (bmp_data !== null) {
		const [color_palette, pixels, width, height] = bmp_data as [string[], number[][], number, number];
		const raw_data = new IndexColorBitmap(width, height, color_palette, pixels);
		data.CopyFromIndexColorBitmap(raw_data, dom.edit_data_name.value);
		data.ApplyView();
		ApplyView();
		return true;
	}
	const bs = Array.from(new Uint8Array(bytes as ArrayBuffer), (v) => String.fromCharCode(v)).join("");
	if (TryReadEditDataByJson(bs)) {
		return true;
	}
	return false;
}

const SetUnselectedColorCellStyle = function (color_cell: HTMLTableDataCellElement): void {
	color_cell.style.borderStyle = 'solid';
	color_cell.style.borderColor = '#000000';
	color_cell.style.borderWidth = '1';
}

const SetSelectedColorCellStyle = function (color_cell: HTMLTableDataCellElement): void {
	color_cell.style.borderStyle = 'solid';
	color_cell.style.borderColor = '#00ff00';
	color_cell.style.borderWidth = '1';
}

function MakeTable(table_id: string, cols: number, rows: number, parent_dom: HTMLElement)
	: HTMLTableDataCellElement[] {
	let tag_text = `<table id="${table_id}" cellspacing="0">`;
	for (let row_i = 0; row_i < rows; row_i++) {
		tag_text += "<tr>";
		for (let col_i = 0; col_i < cols; col_i++) {
			tag_text += `<td draggable="true" id \="${table_id}#${row_i * cols + col_i}"><canvas width="14" height="14"></canvas></td>`;
		}
		tag_text += "<td>";
	}
	tag_text += "</table>";
	parent_dom.innerHTML += tag_text;
	const num_cells = cols * rows;
	const cells = Array<HTMLTableDataCellElement>(num_cells);
	for (let i = 0; i < 256; i++) {
		cells[i] = GetHtmlElement<HTMLTableDataCellElement>(`${table_id}#${i}`);
		SetUnselectedColorCellStyle(cells[i]);
	}
	return cells;
}


class Dom {
	edit_canvas: HTMLCanvasElement;
	view_canvas: HTMLCanvasElement;
	blank_frame: HTMLDivElement;
	edit_block: HTMLDivElement;
	edit_frame: HTMLDivElement;
	default_palette_selector: HTMLSelectElement;
	reset_color_palette_button: HTMLButtonElement;
	palette_color: HTMLInputElement;
	color_caption: HTMLDivElement;
	editwidth: HTMLInputElement;
	editheight: HTMLInputElement;
	edit_scale: HTMLSelectElement;
	view_scale: HTMLSelectElement;
	edit_filepath: HTMLInputElement;
	view_index: HTMLInputElement;
	view_grid: HTMLInputElement;
	view_large_grid: HTMLInputElement;
	large_grid_width: HTMLInputElement;
	large_grid_height: HTMLInputElement;
	dom_pen_tool: HTMLInputElement;
	dom_paint_tool: HTMLInputElement;
	dom_rectangle_select_tool: HTMLInputElement;
	grid_color: HTMLInputElement;
	edit_data_name: HTMLInputElement;
	color_palette: HTMLTableDataCellElement[];
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
	sprite_width: HTMLInputElement;
	sprite_height: HTMLInputElement;
	animation_step_par_frame: HTMLInputElement;
	animation_view_scale: HTMLSelectElement;
	animation_canvas: HTMLCanvasElement;
	animation_playback_button: HTMLButtonElement;
	sprite_indices: HTMLTextAreaElement;
	Initialize() {
		this.edit_canvas = GetHtmlElement<HTMLCanvasElement>('edit');
		this.view_canvas = GetHtmlElement<HTMLCanvasElement>('view');
		this.blank_frame = GetHtmlElement<HTMLDivElement>('blank_frame');
		this.edit_block = GetHtmlElement<HTMLDivElement>('editblock');
		this.edit_frame = GetHtmlElement<HTMLDivElement>('editframe');
		this.default_palette_selector = GetHtmlElement<HTMLSelectElement>('default_palette_selector');
		this.reset_color_palette_button = GetHtmlElement<HTMLButtonElement>('reset_color_palette_button');
		this.palette_color = GetHtmlElement<HTMLInputElement>('palette_color');
		this.color_caption = GetHtmlElement<HTMLInputElement>('color_caption');
		this.editwidth = GetHtmlElement<HTMLInputElement>('editwidth');
		this.editheight = GetHtmlElement<HTMLInputElement>('editheight');
		this.edit_scale = GetHtmlElement<HTMLSelectElement>('edit_scale');
		this.view_scale = GetHtmlElement<HTMLSelectElement>('view_scale');
		this.edit_filepath = GetHtmlElement<HTMLInputElement>('edit_filepath');
		this.view_index = GetHtmlElement<HTMLInputElement>('view_index');
		this.view_grid = GetHtmlElement<HTMLInputElement>('view_grid');
		this.view_large_grid = GetHtmlElement<HTMLInputElement>('view_large_grid');
		this.large_grid_width = GetHtmlElement<HTMLInputElement>('large_grid_width');
		this.large_grid_height = GetHtmlElement<HTMLInputElement>('large_grid_height');
		this.dom_pen_tool = GetHtmlElement<HTMLInputElement>('pen_tool');
		this.dom_paint_tool = GetHtmlElement<HTMLInputElement>('paint_tool');
		this.dom_rectangle_select_tool = GetHtmlElement<HTMLInputElement>('rectangle_select_tool');
		this.grid_color = GetHtmlElement<HTMLInputElement>('grid_color');
		this.edit_data_name = GetHtmlElement<HTMLInputElement>('edit_data_name');
		this.color_palette = new Array<HTMLTableDataCellElement>(256);
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
		this.sprite_width = GetHtmlElement<HTMLInputElement>('sprite_width');
		this.sprite_height = GetHtmlElement<HTMLInputElement>('sprite_height');
		this.animation_step_par_frame = GetHtmlElement<HTMLInputElement>('animation_step_par_frame');
		this.animation_view_scale = GetHtmlElement<HTMLSelectElement>('animation_view_scale');
		this.animation_canvas = GetHtmlElement<HTMLCanvasElement>('animation_canvas');
		this.animation_playback_button = GetHtmlElement<HTMLButtonElement>('animation_playback_button');
		this.sprite_indices = GetHtmlElement<HTMLTextAreaElement>('sprite_indices');
	}
}

const dom = new Dom();

const DrawLine = function (canvas_context, start_x, start_y, end_x, end_y) {
	canvas_context.moveTo(start_x, start_y);
	canvas_context.lineTo(end_x, end_y);
}

const PartiallyDrawGrid = function (canvas_context, w_grid_set, h_grid_set, width_count, height_count, scale, grid_size, grid_color) {
	canvas_context.beginPath();
	const line_height = height_count * grid_size;
	const line_width = width_count * grid_size;
	const adjust_e = -(1 / scale) / 2;
	for (let w of w_grid_set) {
		const x = (w + 1) * grid_size + adjust_e;
		DrawLine(canvas_context, x, -0.5, x, line_height + 0.5);
	}
	for (let h of h_grid_set) {
		const y = (h + 1) * grid_size + adjust_e;
		DrawLine(canvas_context, -0.5, y, line_width + 0.5, y);
	}
	canvas_context.lineWidth = 1 / scale;
	canvas_context.strokeStyle = grid_color;
	canvas_context.stroke();
}

const DrawGrid = function (canvas_context, width_count, height_count, scale, grid_size, grid_color) {
	const all_w_grid_set = new Set();
	const all_h_grid_set = new Set();
	for (var w = 0; w < width_count; w++) {
		all_w_grid_set.add(w);
	}
	for (var h = 0; h < height_count; h++) {
		all_h_grid_set.add(h);
	}
	PartiallyDrawGrid(canvas_context, all_w_grid_set, all_h_grid_set, width_count, height_count, scale, grid_size, grid_color);
}

const DrawLargeGrid = function (canvas_context, width_count, height_count, scale, grid_size, grid_color) {
	const all_w_grid_set = new Set();
	const all_h_grid_set = new Set();
	const large_grid_width = Math.min(512, Math.max(2, dom.large_grid_width.valueAsNumber));
	const large_grid_height = Math.min(512, Math.max(2, dom.large_grid_height.valueAsNumber));
	for (var w = large_grid_width; w <= width_count; w += large_grid_width) {
		all_w_grid_set.add(w - 1);
	}
	for (var h = large_grid_height; h <= height_count; h += large_grid_height) {
		all_h_grid_set.add(h - 1);
	}
	canvas_context.setLineDash([0.5, 0.5]);
	PartiallyDrawGrid(canvas_context, all_w_grid_set, all_h_grid_set, width_count, height_count, scale, grid_size, grid_color);
	canvas_context.setLineDash([]);
}


const PartiallyDrawMapchipIndex = function (edit_context: CanvasRenderingContext2D, target_pixel_set: Set<number>, view_scale: number, color) {
	const font_size = view_font_size;
	edit_context.save();
	edit_context.textAlign = "center";
	edit_context.textBaseline = "middle";
	edit_context.font = `${font_size}px gothic`;
	edit_context.fillStyle = color;
	edit_context.scale(1 / view_scale, 1 / view_scale);
	const y_offset = font_size / 2;
	const width = data.edit_width;
	target_pixel_set.forEach((pixel_index) => {
		const w = PixelPoint.IndexToPixelPointW(pixel_index, width);
		const h = PixelPoint.IndexToPixelPointH(pixel_index, width);
		const dst_x = w * view_scale;
		const dst_y = h * view_scale;
		const ci = marged_pixel_layer.GetPixel(w, h);
		const x_offset = view_scale - String(ci).length * (font_size / 2 - 1) - 1;
		edit_context.fillText(ci.toString(), dst_x + x_offset, dst_y + y_offset);
	});
	edit_context.restore();
}

const DrawMapchipIndex = function (edit_context: CanvasRenderingContext2D, edit_w_count, edit_h_count, view_scale, color) {
	const target_pixel_set = new Set<number>();
	for (var h = 0; h < edit_h_count; h++) {
		for (var w = 0; w < edit_w_count; w++) {
			target_pixel_set.add((new PixelPoint(w, h)).ToIndex(edit_w_count));
		}
	}
	PartiallyDrawMapchipIndex(edit_context, target_pixel_set, view_scale, color);
}

const DrawCanvasPixelsPartial = function (edit_w_count, edit_h_count, view_scale) {
	const written_pixel_set = data.GetWrittenPixelSet();

	const edit_context = dom.edit_canvas.getContext("2d");
	edit_context.imageSmoothingEnabled = false;

	const view_context = dom.view_canvas.getContext('2d');
	view_context.imageSmoothingEnabled = false;

	const update_w_grid_set = new Set<number>();
	const update_h_grid_set = new Set<number>();
	const pi = written_pixel_set.values[0];
	written_pixel_set.forEach((pixel_index) => {
		const w = PixelPoint.IndexToPixelPointW(pixel_index, edit_w_count);
		const h = PixelPoint.IndexToPixelPointH(pixel_index, edit_w_count);
		update_w_grid_set.add(w);
		update_h_grid_set.add(h);
		const mi = marged_pixel_layer.GetPixel(w, h);
		const color = data.GetRgbColorFromPalette(mi).ToHexColor();
		edit_context.fillStyle = color;
		edit_context.fillRect(w, h, 1, 1);
		view_context.fillStyle = color;
		view_context.fillRect(w, h, 1, 1);
	});

	/* マスク表示 */
	edit_context.fillStyle = '#ff0000';
	edit_context.globalAlpha = 0.5;
	written_pixel_set.forEach((pixel_index) => {
		const w = PixelPoint.IndexToPixelPointW(pixel_index, edit_w_count);
		const h = PixelPoint.IndexToPixelPointH(pixel_index, edit_w_count);
		if (data.IsMasked(w, h)) {
			edit_context.fillRect(w, h, 1, 1);
		}
	});
	edit_context.globalAlpha = 1;

	const grid_color = dom.grid_color.value;
	if (dom.view_grid.checked) {
		PartiallyDrawGrid(edit_context, update_w_grid_set, update_h_grid_set, edit_w_count, edit_h_count, view_scale, 1, grid_color);
	}
	if (dom.view_index.checked) {
		PartiallyDrawMapchipIndex(edit_context, written_pixel_set, view_scale, grid_color);
	}
	if (dom.view_large_grid.checked) {
		DrawLargeGrid(edit_context, edit_w_count, edit_h_count, view_scale, 1, large_grid_color);
	}
	written_pixel_set.clear();
}
const UpdatePreview = function (edit_w_count, edit_h_count, view_scale) {
	const view_context = dom.view_canvas.getContext('2d');
	dom.view_canvas.width = edit_w_count * view_scale;
	dom.view_canvas.height = edit_h_count * view_scale;
	view_context.imageSmoothingEnabled = false;
	view_context.scale(view_scale, view_scale);
	for (var h = 0; h < edit_h_count; h++) {
		for (var w = 0; w < edit_w_count; w++) {
			const mi = marged_pixel_layer.GetPixel(w, h);
			view_context.fillStyle = data.GetRgbColorFromPalette(mi).ToHexColor();;
			view_context.fillRect(w, h, 1, 1);
		}
	}
}
const DrawCanvasPixelsAll = function (edit_w_count, edit_h_count, view_scale) {
	const edit_context = dom.edit_canvas.getContext("2d");
	dom.edit_canvas.width = edit_w_count * view_scale;
	dom.edit_canvas.height = edit_h_count * view_scale;
	edit_context.imageSmoothingEnabled = false;
	edit_context.scale(view_scale, view_scale);
	for (var h = 0; h < edit_h_count; h++) {
		for (var w = 0; w < edit_w_count; w++) {
			const mi = marged_pixel_layer.GetPixel(w, h);
			edit_context.fillStyle = data.GetRgbColorFromPalette(mi).ToHexColor();
			edit_context.fillRect(w, h, 1, 1);
		}
	}

	/* マスク表示 */
	edit_context.fillStyle = '#ff0000';
	edit_context.globalAlpha = 0.5;
	for (var h = 0; h < edit_h_count; h++) {
		for (var w = 0; w < edit_w_count; w++) {
			if (data.IsMasked(w, h)) {
				edit_context.fillRect(w, h, 1, 1);
			}
		}
	}
	edit_context.globalAlpha = 1;

	const grid_color = dom.grid_color.value;
	if (dom.view_index.checked) {
		DrawMapchipIndex(edit_context, edit_w_count, edit_h_count, view_scale, grid_color);
	}
	if (dom.view_grid.checked) {
		DrawGrid(edit_context, edit_w_count, edit_h_count, view_scale, 1, grid_color);
	}
	if (dom.view_large_grid.checked) {
		DrawLargeGrid(edit_context, edit_w_count, edit_h_count, view_scale, 1, large_grid_color);
	}
	data.GetWrittenPixelSet().clear();
}

const sprite_animation_indices = new Array<number>(0);
let is_animation_playing = false
const UpdateSpriteIndicesArray = function () {
	const index_strings = dom.sprite_indices.value.split(',');
	sprite_animation_indices.length = 0;
	for (let index_string of index_strings) {
		const parsed = parseInt(index_string);
		if (!isNaN(parsed)) {
			sprite_animation_indices.push(parsed);
		}
	}
}

const DrawSpriteAnimation = function (frame_count: number): void {
	if (!is_animation_playing) {
		return;
	}
	UpdateSpriteIndicesArray();
	if (0 === sprite_animation_indices.length) {
		return;
	}
	const step_par_frame = Math.max(1, dom.animation_step_par_frame.valueAsNumber);
	const frame_number = Math.floor(frame_count / step_par_frame) % sprite_animation_indices.length;
	const sprite_index = sprite_animation_indices[frame_number];
	const sprite_w = Math.max(1, Math.min(data.edit_width, dom.sprite_width.valueAsNumber));
	const sprite_h = Math.max(1, Math.min(data.edit_height, dom.sprite_height.valueAsNumber));
	const sprite_count_in_w = Math.floor(data.edit_width / sprite_w);
	const sprite_count_in_h = Math.floor(data.edit_height / sprite_h);
	const max_sprite_index = sprite_count_in_w * sprite_count_in_h;
	if (max_sprite_index <= sprite_index) {
		return;
	}
	const pixel_w_offset = Math.floor(sprite_index % sprite_count_in_w) * sprite_w;
	const pixel_h_offset = Math.floor(sprite_index / sprite_count_in_w) * sprite_h;
	const max_w = Math.min(pixel_w_offset + sprite_w, data.edit_width);
	const max_h = Math.min(pixel_h_offset + sprite_h, data.edit_height);
	const view_scale = Number(dom.animation_view_scale.value);

	if (dom.animation_canvas.width !== sprite_w * view_scale) {
		dom.animation_canvas.width = sprite_w * view_scale;
	}
	if (dom.animation_canvas.height !== sprite_h * view_scale) {
		dom.animation_canvas.height = sprite_h * view_scale;
	}
	const context = dom.animation_canvas.getContext('2d');
	context.imageSmoothingEnabled = false;
	context.setTransform(1, 0, 0, 1, 0, 0);
	context.scale(view_scale, view_scale);
	for (let h = pixel_h_offset; h < max_h; h++) {
		for (let w = pixel_w_offset; w < max_w; w++) {
			const mi = marged_pixel_layer.GetPixel(w, h);
			context.fillStyle = data.GetRgbColorFromPalette(mi).ToHexColor();
			context.fillRect(w - pixel_w_offset, h - pixel_h_offset, 1, 1);
		}
	}
	return;
}

var frame_count = 0;
let is_preview_touched = true;
const UpdateView = function () {
	MargeLayers();
	if (is_preview_touched || data.is_edit_view_touched) {
		UpdatePreview(data.edit_width, data.edit_height, dom.view_scale.value);
		is_preview_touched = false;
	}
	if (data.is_edit_view_touched) {
		DrawCanvasPixelsAll(data.edit_width, data.edit_height, data.edit_scale);
		data.ClearEditViewTouchedFlag();
	} else {
		DrawCanvasPixelsPartial(data.edit_width, data.edit_height, data.edit_scale);
	}
	if (target_pixels !== null) {
		target_pixels.Draw(dom.edit_canvas.getContext("2d"), data.edit_scale, frame_count, '#ffffff');
		target_pixels.Draw(dom.edit_canvas.getContext("2d"), data.edit_scale, frame_count + 1, '#000000');
	}
	DrawSpriteAnimation(frame_count);
	layer_pane_ui.Draw();

	frame_count++;
	window.requestAnimationFrame(UpdateView);
}

const ChengeCurrentColor = function (new_color_index: number): void {
	const last_index = data.selected_color_index;
	const color = data.GetRgbColorFromPalette(new_color_index).ToHexColor();
	dom.palette_color.value = color;
	SetUnselectedColorCellStyle(dom.color_palette[last_index]);
	SetSelectedColorCellStyle(dom.color_palette[new_color_index]);
	data.selected_color_index = new_color_index;
	dom.color_caption.innerText = `${new_color_index}:${color}`;
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

const ApplyLayerUi = function (): void {
	layer_pane_ui.DeleteAll();
	const creation_parameters = new Array<[number, string, string, PixelLayer]>(0);
	for (let pixel_layer of pixel_layers.values()) {
		creation_parameters.push([pixel_layer.order, pixel_layer.name, pixel_layer.tag_color, pixel_layer]);
	}
	layer_pane_ui.CreateNewLayers(creation_parameters);
	return;
}
function Initialize() {
	dom.Initialize();
	const edit_reader: FileReader = new FileReader();
	dom.edit_canvas.width = 256;
	dom.edit_canvas.height = 192;
	FitDivWidth('editframe', 'editblock');
	FitDivWidth('viewframe', 'viewblock');
	FitDivHeight('viewframe', 'viewblock');
	dom.edit_canvas.addEventListener('mousedown', MouseDownCallback);
	dom.edit_canvas.addEventListener('mouseup', MouseUpCallback);
	dom.edit_canvas.addEventListener('contextmenu', MouseDownCallback);
	dom.edit_canvas.addEventListener('mousemove', MouseMoveCallback);
	dom.edit_canvas.addEventListener('mouseout', MouseOutCallback);

	dom.edit_canvas.addEventListener('touchstart', TouchStartCallback);
	dom.edit_canvas.addEventListener('touchend', TouchEndCallback);
	dom.edit_canvas.addEventListener('touchmove', TouchMoveCallback);

	dom.editwidth.max = max_edit_width.toString();
	dom.editheight.max = max_edit_height.toString();
	dom.editwidth.value = default_edit_width.toString();
	dom.editheight.value = default_edit_height.toString();
	dom.edit_scale.value = default_edit_scale.toString();
	data.edit_width = dom.editwidth.valueAsNumber;
	data.edit_height = dom.editheight.valueAsNumber;
	data.edit_scale = Number(dom.edit_scale.value);

	dom.editwidth.addEventListener('change', (event) => {
		data.edit_width = (<HTMLInputElement>event.target).valueAsNumber;
	});
	dom.editheight.addEventListener('change', (event) => {
		data.edit_height = (<HTMLInputElement>event.target).valueAsNumber;
	});
	dom.edit_scale.addEventListener('change', (event) => {
		data.edit_scale = Number((<HTMLSelectElement>event.target).value);
	});
	dom.edit_filepath.addEventListener('change', (event) => {
		edit_reader.readAsArrayBuffer((<HTMLInputElement>event.target).files[0]);
	})
	dom.view_scale.addEventListener('change', (event) => {
		is_preview_touched = true;
	});
	dom.view_index.addEventListener('change', (event) => {
		data.TouchEditView();
	});
	dom.view_grid.addEventListener('change', (event) => {
		data.TouchEditView();
	});
	dom.view_large_grid.addEventListener('change', (event) => {
		data.TouchEditView();
	});
	dom.large_grid_width.addEventListener('change', (event) => {
		data.TouchEditView();
	});
	dom.large_grid_height.addEventListener('change', (event) => {
		data.TouchEditView();
	});
	dom.grid_color.addEventListener('input', (event) => {
		data.TouchEditView();
	});
	dom.dom_pen_tool.addEventListener('change', (event) => {
		tool = pen_tool;
	});
	dom.dom_paint_tool.addEventListener('change', (event) => {
		tool = paint_tool;
	});
	dom.dom_rectangle_select_tool.addEventListener('change', (event) => {
		tool = rentangle_select_tool;
	});
	const dl_button = new UiParts.DonwloadButton(
		GetHtmlElement<HTMLDivElement>("edit_command"), "保存（ダウンロード）", () => {
			const basename = dom.edit_data_name.value;
			const save_format = GetHtmlElement<HTMLSelectElement>('edit_save_format').value;
			return MakeSaveData(basename, save_format)
		});
	edit_reader.addEventListener('load', (event) => {
		const basename = Misc.ExtractBaseName(dom.edit_filepath.value);
		dom.edit_data_name.value = basename;
		LoadEditData((<FileReader>event.target).result);
		data.TouchEditView();
	});

	dom.color_palette = MakeTable('color_palette', 16, 16, dom.blank_frame);
	for (let i = 0; i < 256; i++) {
		dom.color_palette[i].addEventListener('click', () => {
			ChengeCurrentColor(i);
		});
		dom.color_palette[i].addEventListener('dragstart', (event) => {
			event.dataTransfer.setData("color_index", i.toString());
		});
		dom.color_palette[i].addEventListener('dragover', (event) => {
			event.preventDefault();
		});
		dom.color_palette[i].addEventListener('drop', (event) => {
			event.preventDefault();
			const drag_color_index = parseInt(event.dataTransfer.getData("color_index"));
			data.SwapColor(i, drag_color_index);
			const tmp_color = dom.color_palette[drag_color_index].style.backgroundColor;
			dom.color_palette[drag_color_index].style.backgroundColor = dom.color_palette[i].style.backgroundColor;
			dom.color_palette[i].style.backgroundColor = tmp_color;
		});
	}

	const ResetColorPalette = function (palette_type: number) {
		if (palette_type === 0) {
			return;
		}
		const hex_color_string_array
			= palette_type === 1 ? Misc.MakeHSVBalancedColorList(1)
				: palette_type === 2 ? Misc.MakeHSVBalancedColorList(2)
					: palette_type === 3 ? Misc.MakeHSVBalancedColorList(4)
						: palette_type === 4 ? Misc.MakeWebSafeColorList()
							: Misc.MakeWebSafeColorList();
		for (let i = 0; i < 256; i++) {
			const color_cell = dom.color_palette[i];
			const hex_color = hex_color_string_array[i];
			data.GetRgbColorFromPalette(i).SetHexColor(hex_color);
			color_cell.style.backgroundColor = hex_color;
		}
		ChengeCurrentColor(data.selected_color_index);
	};
	dom.reset_color_palette_button.addEventListener('click', (event) => {
		ResetColorPalette(Number(dom.default_palette_selector.value));
		dom.default_palette_selector.value = "0";
	});

	let creation_count = 0;
	const MakeLayerDefaultName = function (): [string, string] {
		const hue = (creation_count * 79) % 360;
		const color = new RgbColor(...Misc.HsvToRgb(hue, 0.375, 0.75))
		const name = `new layer #${creation_count}`;
		creation_count++;
		return [name, color.ToHexColor()];
	}
	if (AutoLoad()) {
		ApplyColorPalette();
	} else {
		ResetColorPalette(1);
		pixel_layers.clear();
		const pixel_layer = new PixelLayer(0, ...MakeLayerDefaultName(), max_edit_width, max_edit_height);
		pixel_layers.set(pixel_layer, pixel_layer);
	}
	dom.editwidth.value = data.edit_width.toString();
	dom.editheight.value = data.edit_height.toString();

	dom.palette_color.addEventListener('input', (event) => {
		const i = data.selected_color_index;
		const rgb_color = data.GetRgbColorFromPalette(i);
		data.GetRgbColorFromPalette(i).SetHexColor((<HTMLInputElement>event.target).value);
		dom.color_palette[i].style.backgroundColor = rgb_color.ToRgbString();
		data.TouchEditView();
	});

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
		ApplyColorPalette();
		ChengeCurrentColor(data.selected_color_index);
	});
	dom.animation_playback_button.addEventListener('click', (event) => {
		const button = (<HTMLButtonElement>event.target);
		button.innerText = is_animation_playing === true ? "▶︎" : "■";
		is_animation_playing = !is_animation_playing;
	});
	const layers = document.getElementById("layerblock");
	layer_pane_ui = new UiParts.LayerPaneUi<PixelLayer>(
		layers,
		(order) => {
			const param = MakeLayerDefaultName();
			const new_pixel_layer = new PixelLayer(order, ...param, max_edit_width, max_edit_height);
			pixel_layers.set(new_pixel_layer, new_pixel_layer);
			return [...param, new_pixel_layer];
		},
		(pixel_layer, order) => {
			pixel_layers.delete(pixel_layer);
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
				dom.edit_frame.style.backgroundColor = tag_color;
				if (is_locked) {
					dom.edit_canvas.style.cursor = 'not-allowed';
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
	ApplyLayerUi();


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

const MakeSaveDataBlobAsWindowsIndexColorBitmap = function () {
	const save_data = data.MakeSaveData();
	const index_bmp = MargeMultiLayerIndexColorBitmapToIndexBitmap(save_data);
	const bmp_bytes = WindowsIndexColorBitmap.Serialize(index_bmp.color_palette, index_bmp.pixels, index_bmp.width, index_bmp.height);
	const save_data_blob = new Blob([bmp_bytes]);
	return save_data_blob;
};

const MakeSaveDataBlobAsJson = function () {
	const save_data = data.MakeSaveData();
	const save_data_json = JSON.stringify(save_data);
	const save_data_blob = new Blob([save_data_json], {
		type: 'application/json'
	});
	return save_data_blob;
};

const MakeSaveData = function (basename: string, save_format: string): [string, Blob] {
	switch (save_format) {
		case "WindowsIndexColorBitmap":
			return [`${basename}.bmp`, MakeSaveDataBlobAsWindowsIndexColorBitmap()];
		case "JSON":
		default:
			return [`${basename}.json`, MakeSaveDataBlobAsJson()];
	}
};

Initialize();
