/// <reference path="./windows_bitmap.ts" />
/// <reference path="./misc.ts" />
/// <reference path="./browser.ts" />

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

const view_font_size: number = 8;
const max_edit_width: number = 512;
const max_edit_height: number = 512;
const default_edit_width: number = 32;
const default_edit_height: number = 32;
const default_edit_scale: number = 8;
const large_grid_color = '#ffff00';

class EditLogger {
	private undo_stack_: IndexColorBitmap[];
	private redo_stack_: IndexColorBitmap[];
	constructor() {
		this.undo_stack_ = new Array<IndexColorBitmap>(0);
		this.redo_stack_ = new Array<IndexColorBitmap>(0);
	}
	public IsUndoLogEmpty(): boolean {
		return (this.undo_stack_.length == 0) ? true : false;
	}
	public IsRedoLogEmpty(): boolean {
		return (this.redo_stack_.length == 0) ? true : false;
	}
	public PushUndoLog(log_data: IndexColorBitmap): void {
		this.undo_stack_.push(log_data);
	}
	public PushRedoLog(log_data: IndexColorBitmap): void {
		this.redo_stack_.push(log_data);
	}
	public PopUndoLog(): IndexColorBitmap {
		return this.undo_stack_.pop();
	}
	public PopRedoLog(): IndexColorBitmap {
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

class Data {
	private pixels_: number[][];
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
		this.pixels_ = Misc.Make2dArray<number>(max_width, max_height, 0);
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
	public CopyFrom(other_data: Data): void {
		this.pixels_ = other_data.pixels_;
		this.edit_width_ = other_data.edit_width_;
		this.edit_height_ = other_data.edit_height_;
		this.selected_color_index_ = other_data.selected_color_index_;
		for (let i = 0; i < 256; i++) {
			this.color_palette_[i].r = other_data.color_palette_[i].r;
			this.color_palette_[i].g = other_data.color_palette_[i].g;
			this.color_palette_[i].b = other_data.color_palette_[i].b;
		}
		this.selected_bg_color_index_ = other_data.selected_bg_color_index_;
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
		if (this.pixels_mask_[h][w]) {
			return;
		}
		this.pixels_[h][w] = color_index;
		const pixel_index = this.edit_width_ * h + w;
		this.pixels_written_set_.add(pixel_index);
	}
	public TouchPixel(w: number, h: number): void {
		const pixel_index = this.edit_width_ * h + w;
		this.pixels_written_set_.add(pixel_index);
	}
	public GetWrittenColorIndex(w: number, h: number): number {
		return this.pixels_[h][w];
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
				histogram[this.pixels_[h][w]]++;
			}
		}
		for (let i = 0; i < 256; i++) {
			if (histogram[i] == 0) {
				data.color_palette_[i].r = 0;
				data.color_palette_[i].g = 0;
				data.color_palette_[i].b = 0;
			}
		}
	}
	public MakeRawSaveData(): IndexColorBitmap {
		const edit_w_count = this.edit_width_;
		const edit_h_count = this.edit_height_;
		const save_pixels = new Array<number[]>(edit_h_count);
		for (var h = 0; h < edit_h_count; h++) {
			save_pixels[h] = this.pixels_[h].slice(0, edit_w_count);
		}
		const color_palette = new Array(256);
		for (var i = 0; i < 256; i++) {
			color_palette[i] = this.color_palette_[i].ToRgbString();
		}
		return new IndexColorBitmap(edit_w_count, edit_h_count, color_palette, save_pixels);
	}
	public ApplyRawData(raw_data: IndexColorBitmap): void {
		this.edit_width_ = raw_data.width;
		this.edit_height_ = raw_data.height;
		for (let h = 0; h < raw_data.height; h++) {
			for (let w = 0; w < raw_data.width; w++) {
				this.pixels_[h][w] = raw_data.pixels[h][w];
			}
		}
		for (let i = 0; i < 256; i++) {
			data.GetRgbColorFromPalette(i).SetColorString(raw_data.color_palette[i]);
		}
		this.TouchEditView();
	}

	public CopyToClipBoard(left: number, top: number, right: number, bottom: number): void {
		const copy_w = right - left + 1;
		const copy_h = bottom - top + 1;
		for (let dst_h = 0; dst_h < copy_h; dst_h++) {
			const src_h = top + dst_h;
			for (let dst_w = 0; dst_w < copy_w; dst_w++) {
				const src_w = left + dst_w;
				this.pixels_clipboard_[dst_h][dst_w] = this.pixels_[src_h][src_w];
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
				if (this.selected_bg_color_index_ != this.pixels_clipboard_[src_h][src_w]) {
					const dst_w = left + src_w;
					data.WriteMap(dst_w, dst_h, this.pixels_clipboard_[src_h][src_w]);
				}
			}
		}
	}

	public PushUndoLog(): void {
		const current_data = data.MakeRawSaveData();
		this.logger_.PushUndoLog(current_data);
		this.logger_.ClearRedoLog();
		AutoSave();
	}
	public Undo(): void {
		if (this.logger_.IsUndoLogEmpty()) {
			return;
		}
		const current_data = data.MakeRawSaveData();
		this.logger_.PushRedoLog(current_data);
		const undo_data = this.logger_.PopUndoLog();
		this.ApplyRawData(undo_data);
	}
	public Redo() {
		if (this.logger_.IsRedoLogEmpty()) {
			return;
		}
		const current_data = data.MakeRawSaveData();
		this.logger_.PushUndoLog(current_data);
		const redo_data = this.logger_.PopRedoLog();
		this.ApplyRawData(redo_data);
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
		if (data.GetWrittenColorIndex(new_point.w, new_point.h) != target_color_index) {
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
		if (next_pixel_queue.length == 0) {
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
		if (target_pixels != null) {
			target_pixels.Update(this.start_point, this.start_point);
		} else {
			target_pixels = new RectangleTargetPixels(this.start_point, this.start_point);
		}
	};
	public MouseMove(pixel_w: number, pixel_h: number) {
		const point = new PixelPoint(pixel_w, pixel_h);
		if (target_pixels != null && this.start_point != null) {
			target_pixels.Update(this.start_point, point);
		} else {
			this.start_point = point;
			target_pixels.Update(this.start_point, this.start_point);
		}
		return;
	};
}

const data: Data = new Data(default_edit_width, default_edit_height, max_edit_width, max_edit_height);
const pen_tool: PenTool = new PenTool();
const paint_tool: PaintTool = new PaintTool();
const rentangle_select_tool: RectangleSelectTool = new RectangleSelectTool();
let tool: Tool = pen_tool;
let target_pixels: RectangleTargetPixels | null = null;

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
	if (event.buttons == 0x01) {
		tool.MouseMove(...GetPixelPoint(event, data.edit_scale));
	}
};

const MouseOutCallback = function (event: MouseEvent) {
	if (event.buttons == 0x01) {
		tool.MouseOut(...GetPixelPoint(event, data.edit_scale));
	}
};

const TouchStartCallback = function (event: TouchEvent) {
	if (event.touches.length == 1) {
		tool.LeftButtonDown(...GetTouchPixelPoint(event, data.edit_scale));
	}
};

const TouchEndCallback = function (event: TouchEvent) {
	if (event.touches.length == 1) {
		tool.LeftButtonUp(...GetTouchPixelPoint(event, data.edit_scale));
	}
};

const TouchMoveCallback = function (event: TouchEvent) {
	if (event.touches.length == 1) {
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
	const read_data = JSON.parse(bytes) as IndexColorBitmap;
	data.ApplyRawData(read_data);
	ApplyView();
	return true;
}

const LoadEditData = function (bytes: string | ArrayBuffer) {
	const bmp_data = WindowsIndexColorBitmap.Deserialize(bytes as ArrayBuffer);
	if (bmp_data != null) {
		const [color_palette, pixels, width, height] = bmp_data as [string[], number[][], number, number];
		const raw_data = new IndexColorBitmap(width, height, color_palette, pixels);
		data.ApplyRawData(raw_data);
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
			tag_text += `<td id \="${table_id}#${row_i * cols + col_i}"><canvas width="14" height="14"></canvas></td>`;
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
	canvas_bg_color: HTMLInputElement;
	save_picture_button: HTMLLinkElement;
	edit_data_name: HTMLInputElement;
	color_palette: HTMLTableDataCellElement[];
	undo_button: HTMLButtonElement;
	redo_button: HTMLButtonElement;
	h_turn_button: HTMLButtonElement;
	v_turn_button: HTMLButtonElement;
	break_to_mask_button: HTMLButtonElement;
	release_targetting_button: HTMLButtonElement;
	turn_mask_button: HTMLButtonElement;
	delete_mask_button: HTMLButtonElement;
	delete_all_unused_colors_button: HTMLButtonElement;
	Initialize() {
		this.edit_canvas = GetHtmlElement<HTMLCanvasElement>('edit');
		this.view_canvas = GetHtmlElement<HTMLCanvasElement>('view');
		this.blank_frame = GetHtmlElement<HTMLDivElement>('blank_frame');
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
		this.canvas_bg_color = GetHtmlElement<HTMLInputElement>('canvas_bg_color');
		this.save_picture_button = GetHtmlElement<HTMLLinkElement>('download_edit_data');
		this.edit_data_name = GetHtmlElement<HTMLInputElement>('edit_data_name');
		this.color_palette = new Array<HTMLTableDataCellElement>(256);
		this.undo_button = GetHtmlElement<HTMLButtonElement>('undo_button');
		this.redo_button = GetHtmlElement<HTMLButtonElement>('redo_button');
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
		const ci = data.GetWrittenColorIndex(w, h);
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
		const mi = data.GetWrittenColorIndex(w, h);
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
			const mi = data.GetWrittenColorIndex(w, h);
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
			const mi = data.GetWrittenColorIndex(w, h);
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



var frame_count = 0;
let is_preview_touched = true;
const UpdateView = function () {
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
	if (target_pixels != null) {
		target_pixels.Draw(dom.edit_canvas.getContext("2d"), data.edit_scale, frame_count, '#ffffff');
		target_pixels.Draw(dom.edit_canvas.getContext("2d"), data.edit_scale, frame_count + 1, '#000000');
	}

	dom.edit_frame.style.backgroundColor = dom.canvas_bg_color.value;
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
		window.localStorage.setItem('data', JSON.stringify(data));
	}
}
const AutoLoad = function (): boolean {
	if (Browser.isStorageAvailable('localStorage')) {
		const data_json = window.localStorage.getItem('data') as string | null;
		if (data_json != null) {
			const load_data = JSON.parse(data_json) as Data;
			data.CopyFrom(load_data);
			return true;
		}
	}
	return false;
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
	dom.canvas_bg_color.addEventListener('input', (event) => {
		dom.edit_frame.style.backgroundColor = (<HTMLInputElement>event.target).value;
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
	dom.save_picture_button.addEventListener('click', DownloadEditData);

	edit_reader.addEventListener('load', (event) => {
		LoadEditData((<FileReader>event.target).result);
		const basename = Misc.ExtractBaseName(dom.edit_filepath.value);
		dom.edit_data_name.value = basename;
		data.TouchEditView();
	});

	dom.color_palette = MakeTable('color_palette', 16, 16, dom.blank_frame);
	for (let i = 0; i < 256; i++) {
		dom.color_palette[i].addEventListener('click', () => {
			ChengeCurrentColor(i);
		});
	}

	const ResetColorPalette = function (palette_type: number) {
		if (palette_type == 0) {
			return;
		}
		const hex_color_string_array
			= palette_type == 1 ? Misc.MakeHSVBalancedColorList(1)
				: palette_type == 2 ? Misc.MakeHSVBalancedColorList(2)
					: palette_type == 3 ? Misc.MakeHSVBalancedColorList(4)
						: palette_type == 4 ? Misc.MakeWebSafeColorList()
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
	if (AutoLoad()) {
		ApplyColorPalette();
	} else {
		ResetColorPalette(1);
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
	dom.v_turn_button.addEventListener('click', (event) => {
		if (target_pixels != null) {
			target_pixels.VerticalTurn();
		}
	});
	dom.h_turn_button.addEventListener('click', (event) => {
		if (target_pixels != null) {
			target_pixels.HorizontalTurn();
		}
	});
	dom.break_to_mask_button.addEventListener('click', (event) => {
		if (target_pixels != null) {
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
	const save_data = data.MakeRawSaveData();
	const bmp_bytes = WindowsIndexColorBitmap.Serialize(save_data.color_palette, save_data.pixels, save_data.width, save_data.height);
	const save_data_blob = new Blob([bmp_bytes]);
	return save_data_blob;
};

const MakeSaveDataBlobAsJson = function () {
	const save_data = data.MakeRawSaveData();
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

function DownloadEditData() {
	const basename = dom.edit_data_name.value;
	const save_format = GetHtmlElement<HTMLSelectElement>('edit_save_format').value;
	const [savefilename, savedata_blob] = MakeSaveData(basename, save_format)
	const object_url = window.URL.createObjectURL(savedata_blob);
	const download_link = GetHtmlElement<HTMLLinkElement>('download_edit_data');
	download_link.setAttribute('href', object_url);
	download_link.setAttribute('download', savefilename);
}

Initialize();
