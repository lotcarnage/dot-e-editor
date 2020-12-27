class EditPoint {
	public w: number;
	public h: number;
	public constructor(w: number, h: number) {
		this.w = w;
		this.h = h;
	}
	ToIndex(width: number): number {
		return width * this.h + this.w;
	}
}

const view_font_size: number = 8;
const max_edit_width: number = 512;
const max_edit_height: number = 512;
const default_edit_width: number = 32;
const default_edit_height: number = 32;
const default_edit_scale: number = 8;
class RawData {
	width: number;
	height: number;
	color_palette: string[];
	tiles: number[][];
	constructor(width: number, height: number, color_palette: string[], tiles: number[][]) {
		this.width = width;
		this.height = height;
		this.color_palette = color_palette;
		this.tiles = tiles;
	};
}

class Data {
	private pixels_: number[][];
	private pixels_written_set_: Set<number>;
	private edit_scale_: number;
	private edit_width_: number;
	private edit_height_: number;
	private is_edit_view_touched_: boolean;
	private selected_color_index_: number;
	public constructor() {
		this.edit_width_ = default_edit_width;
		this.edit_height_ = default_edit_height;
		this.pixels_ = JSON.parse(JSON.stringify((new Array(max_edit_height)).fill((new Array(max_edit_width)).fill(0))));
		this.pixels_written_set_ = new Set<number>();
		this.selected_color_index_ = 0;
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
	public WriteMap(point: EditPoint, color_index: number) {
		this.pixels_[point.h][point.w] = color_index;
		this.pixels_written_set_.add(point.ToIndex(data.edit_width_));
	}
	public GetWrittenColorIndex(point: EditPoint): number {
		return this.pixels_[point.h][point.w];

	}
	public GetWrittenPixelSet(): Set<number> {
		return this.pixels_written_set_;
	}
	public MakeRawSaveData(): RawData {
		const edit_w_count = this.edit_width_;
		const edit_h_count = this.edit_height_;
		const save_tiles = new Array(edit_h_count);
		for (var h = 0; h < edit_h_count; h++) {
			save_tiles[h] = this.pixels_[h].slice(0, edit_w_count);
		}
		const color_palette = new Array(256);
		for (var i = 0; i < 256; i++) {
			color_palette[i] = document.getElementById(`color_palette#${i}`).style.backgroundColor;
		}
		return new RawData(edit_w_count, edit_h_count, color_palette, save_tiles);
	}
}

const IndexToEditPoint = function (index: number, width: number): EditPoint {
	const w = Math.floor(index % width);
	const h = Math.floor(index / width);
	return new EditPoint(w, h);
}

const GetTilePoint = function (event: MouseEvent, block_size: number): EditPoint {
	const rect: DOMRect = (<HTMLCanvasElement>event.target).getBoundingClientRect();
	const w: number = Math.floor((event.clientX - rect.left) / block_size);
	const h: number = Math.floor((event.clientY - rect.top) / block_size);
	return new EditPoint(w, h);
};

class Tool {
	public LeftButtonDown(event: MouseEvent) { };
	public LeftButtonUp(event: MouseEvent) { };
	public RightButtonDown(event: MouseEvent) { };
	public RightButtonUp(event: MouseEvent) { };
	public MouseMove(event: MouseEvent) { };
}

class PenTool extends Tool {
	public LeftButtonDown(event: MouseEvent) {
		const point = GetTilePoint(event, data.edit_scale);
		data.WriteMap(point, data.selected_color_index);
		return;
	};
	public RightButtonDown(event: MouseEvent) {
		const point = GetTilePoint(event, data.edit_scale);
		data.selected_color_index = data.GetWrittenColorIndex(point);
		return;
	};
	public MouseMove(event: MouseEvent) {
		if (event.buttons === 1) {
			const point = GetTilePoint(event, data.edit_scale);
			data.WriteMap(point, data.selected_color_index);
		}
		return;
	};
}


const ExtractRegionPixelSet = function (start_point: EditPoint): Set<number> {
	const min_w: 0 = 0;
	const min_h: 0 = 0;
	const max_w: number = data.edit_width;
	const max_h: number = data.edit_height;
	const region_pixels = new Set<number>();
	const next_pixel_queue: EditPoint[] = new Array<EditPoint>();
	const target_color_index: number = data.GetWrittenColorIndex(start_point);
	region_pixels.add(start_point.ToIndex(max_w));
	next_pixel_queue.push(start_point);
	const AddPixelToRegion = function (new_point: EditPoint) {
		if (data.GetWrittenColorIndex(new_point) != target_color_index) {
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
			AddPixelToRegion(new EditPoint(pixel.w + 0, pixel.h - 1));
		}
		if (min_w < pixel.w) {
			AddPixelToRegion(new EditPoint(pixel.w - 1, pixel.h + 0));
		}
		if (pixel.w < max_w) {
			AddPixelToRegion(new EditPoint(pixel.w + 1, pixel.h + 0));
		}
		if (pixel.h < max_h) {
			AddPixelToRegion(new EditPoint(pixel.w + 0, pixel.h + 1));
		}
	}
	return region_pixels;
};


class PaintTool extends Tool {
	public LeftButtonDown(event: MouseEvent) {
		const selected_pixel = GetTilePoint(event, data.edit_scale);
		const new_color_index = data.selected_color_index;
		const region_pixel_set = ExtractRegionPixelSet(selected_pixel);
		const max_w = data.edit_width;
		region_pixel_set.forEach((pixel_index) => {
			data.WriteMap(IndexToEditPoint(pixel_index, max_w), new_color_index);
		});
	};
	public RightButtonDown(event: MouseEvent) {
		const point = GetTilePoint(event, data.edit_scale);
		data.selected_color_index = data.GetWrittenColorIndex(point);
	};
}

const data: Data = new Data();
const pen_tool: PenTool = new PenTool();
const paint_tool: PaintTool = new PaintTool();
let tool: Tool = pen_tool;

function GetHtmlElement<T extends HTMLElement>(element_id: string): T {
	return <T>document.getElementById(element_id);
}

const MouseDownCallback = function (event: MouseEvent) {
	if (event.button === 0) {
		tool.LeftButtonDown(event);
	} else if (event.button === 2) {
		tool.RightButtonDown(event);
	}
};

const MouseUpCallback = function (event) {
	if (event.button === 0) {
		tool.LeftButtonUp(event);
	} else if (event.button === 2) {
		tool.RightButtonUp(event);
	}
};

const MouseMoveCallback = function (event) {
	tool.MouseMove(event);
};


function AddListener(dom_id: string, event_name: string, callback: (event: any) => void) {
	document.getElementById(dom_id).addEventListener(event_name, callback);
}

const ResizeCanvas = function (canvas_id: string, new_width: number, new_height: number): void {
	const canvas = <HTMLCanvasElement>document.getElementById(canvas_id);
	canvas.width = new_width;
	canvas.height = new_height;
	return;
};

const FitDivWidth = function (modify_div_id: string, referencet_div_id: string) {
	const new_width = (<HTMLDivElement>document.getElementById(referencet_div_id)).clientWidth;
	(<HTMLDivElement>document.getElementById(modify_div_id)).style.width = `${new_width}px`;
};

const ExtractBaseName = function (filepath: string) {
	const path_delimiter = /\\/g;
	const path_tokens = filepath.slice(0).replace(path_delimiter, '/').split('/');
	const filename = (2 <= path_tokens.length) ? path_tokens[path_tokens.length - 1] : path_tokens[0];
	const name_tokens = filename.split('.');
	const basename = (2 <= name_tokens.length) ? name_tokens.splice(0, name_tokens.length - 1).join('.') : name_tokens[0];
	return basename;
}

const TryReadEditDataByJson = function (bytes: string) {
	const read_data = JSON.parse(bytes) as RawData;
	data.edit_width = read_data.width as number;
	data.edit_height = read_data.height as number;
	GetHtmlElement<HTMLInputElement>('editwidth').value = data.edit_width.toString();
	GetHtmlElement<HTMLInputElement>('editheight').value = data.edit_height.toString();
	const edit_w_count = data.edit_width;
	const edit_h_count = data.edit_height;
	for (var h = 0; h < edit_h_count; h++) {
		for (var w = 0; w < edit_w_count; w++) {
			data.WriteMap(new EditPoint(w, h), read_data.tiles[h][w]);
		}
	}
	for (var i = 0; i < 256; i++) {
		document.getElementById(`color_palette#${i}`).style.backgroundColor = read_data.color_palette[i];
	}
	return true;
}

const LoadEditData = function (bytes: string) {
	if (TryReadEditDataByJson(bytes)) {
		return true;
	}
	return false;
}

function MakeTable(table_id: string, cols: number, rows: number) {
	let tag_text = `<table id="${table_id}">`;
	for (let row_i = 0; row_i < rows; row_i++) {
		tag_text += "<tr>";
		for (let col_i = 0; col_i < cols; col_i++) {
			tag_text += `<td id \="${table_id}#${row_i * cols + col_i}"><canvas width="16" height="16"></canvas></td>`;
		}
		tag_text += "<td>";
	}
	tag_text += "</table>";
	return tag_text;
}

const RgbStringToHexColor = function (rgb_string: string) {
	const [r_string, g_string, b_string] = rgb_string.split('(')[1].split(')')[0].split(',');
	const r_hex = ('00' + Number(r_string).toString(16)).slice(-2);
	const g_hex = ('00' + Number(g_string).toString(16)).slice(-2);
	const b_hex = ('00' + Number(b_string).toString(16)).slice(-2);
	return `#${r_hex}${g_hex}${b_hex}`;
}

class Dom {
	edit_canvas: HTMLCanvasElement;
	blank_frame: HTMLDivElement;
	edit_frame: HTMLDivElement;
	palette_color: HTMLInputElement;
	editwidth: HTMLInputElement;
	editheight: HTMLInputElement;
	edit_scale: HTMLSelectElement;
	edit_filepath: HTMLInputElement;
	view_index: HTMLInputElement;
	view_grid: HTMLInputElement;
	dom_pen_tool: HTMLInputElement;
	dom_paint_tool: HTMLInputElement;
	dom_grid_color: HTMLInputElement;
	dom_canvas_bg_color: HTMLInputElement;
	save_picture_button: HTMLLinkElement;
	Initialize() {
		this.edit_canvas = GetHtmlElement<HTMLCanvasElement>('edit');
		this.blank_frame = GetHtmlElement<HTMLDivElement>('blank_frame');
		this.edit_frame = GetHtmlElement<HTMLDivElement>('editframe');
		this.palette_color = GetHtmlElement<HTMLInputElement>('palette_color');
		this.editwidth = GetHtmlElement<HTMLInputElement>('editwidth');
		this.editheight = GetHtmlElement<HTMLInputElement>('editheight');
		this.edit_scale = GetHtmlElement<HTMLSelectElement>('edit_scale');
		this.edit_filepath = GetHtmlElement<HTMLInputElement>('edit_filepath');
		this.view_index = GetHtmlElement<HTMLInputElement>('view_index');
		this.view_grid = GetHtmlElement<HTMLInputElement>('view_grid');
		this.dom_pen_tool = GetHtmlElement<HTMLInputElement>('pen_tool');
		this.dom_paint_tool = GetHtmlElement<HTMLInputElement>('paint_tool');
		this.dom_grid_color = GetHtmlElement<HTMLInputElement>('grid_color');
		this.dom_canvas_bg_color = GetHtmlElement<HTMLInputElement>('canvas_bg_color');
		this.save_picture_button = GetHtmlElement<HTMLLinkElement>('download_edit_data');
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

const PartiallyDrawMapchipIndex = function (edit_context: CanvasRenderingContext2D, target_maptile_set: Set<number>, view_scale: number, color) {
	const font_size = view_font_size;
	edit_context.save();
	edit_context.textAlign = "center";
	edit_context.textBaseline = "middle";
	edit_context.font = `${font_size}px gothic`;
	edit_context.fillStyle = color;
	edit_context.scale(1 / view_scale, 1 / view_scale);
	const y_offset = font_size / 2;
	const width = data.edit_width;
	target_maptile_set.forEach((pixel_index) => {
		const point = IndexToEditPoint(pixel_index, width);
		const dst_x = point.w * view_scale;
		const dst_y = point.h * view_scale;
		const ci = data.GetWrittenColorIndex(point);
		const x_offset = view_scale - String(ci).length * (font_size / 2 - 1) - 1;
		edit_context.fillText(ci.toString(), dst_x + x_offset, dst_y + y_offset);
	});
	edit_context.restore();
}

const DrawMapchipIndex = function (edit_context: CanvasRenderingContext2D, edit_w_count, edit_h_count, view_scale, color) {
	const target_maptile_set = new Set<number>();
	for (var h = 0; h < edit_h_count; h++) {
		for (var w = 0; w < edit_w_count; w++) {
			target_maptile_set.add((new EditPoint(w, h)).ToIndex(edit_w_count));
		}
	}
	PartiallyDrawMapchipIndex(edit_context, target_maptile_set, view_scale, color);
}

const UpdateEditViewUpdateTiles = function (edit_w_count, edit_h_count, view_scale) {
	const edit_context = dom.edit_canvas.getContext("2d");
	const written_pixel_set = data.GetWrittenPixelSet();
	edit_context.scale(1, 1);
	edit_context.imageSmoothingEnabled = false;
	const update_w_grid_set = new Set<number>();
	const update_h_grid_set = new Set<number>();
	written_pixel_set.forEach((pixel_index) => {
		const point = IndexToEditPoint(pixel_index, edit_w_count);
		update_w_grid_set.add(point.w);
		update_h_grid_set.add(point.h);
		const dst_x = point.w;
		const dst_y = point.h;
		const mi = data.GetWrittenColorIndex(point);
		edit_context.fillStyle = document.getElementById(`color_palette#${mi}`).style.backgroundColor;
		edit_context.fillRect(dst_x, dst_y, 1, 1);
	});
	const grid_color = dom.dom_grid_color.value;
	if (dom.view_grid.checked) {
		PartiallyDrawGrid(edit_context, update_w_grid_set, update_h_grid_set, edit_w_count, edit_h_count, view_scale, 1, grid_color);
	}
	if (dom.view_index.checked) {
		PartiallyDrawMapchipIndex(edit_context, written_pixel_set, view_scale, grid_color);
	}
	written_pixel_set.clear();
}

const UpdateEditView = function (edit_w_count, edit_h_count, view_scale) {
	const edit_context = dom.edit_canvas.getContext("2d");
	dom.edit_canvas.width = edit_w_count * view_scale;
	dom.edit_canvas.height = edit_h_count * view_scale;
	edit_context.imageSmoothingEnabled = false;
	edit_context.scale(view_scale, view_scale);
	for (var h = 0; h < edit_h_count; h++) {
		for (var w = 0; w < edit_w_count; w++) {
			const dst_x = w;
			const dst_y = h;
			const mi = data.GetWrittenColorIndex(new EditPoint(w, h));
			edit_context.fillStyle = document.getElementById(`color_palette#${mi}`).style.backgroundColor;
			edit_context.fillRect(dst_x, dst_y, 1, 1);
		}
	}
	const grid_color = dom.dom_grid_color.value;
	if (dom.view_index.checked) {
		DrawMapchipIndex(edit_context, edit_w_count, edit_h_count, view_scale, grid_color);
	}
	if (dom.view_grid.checked) {
		DrawGrid(edit_context, edit_w_count, edit_h_count, view_scale, 1, grid_color);
	}
}


const UpdateView = function () {
	if (data.is_edit_view_touched) {
		UpdateEditView(data.edit_width, data.edit_height, data.edit_scale);
		data.ClearEditViewTouchedFlag();
	} else {
		UpdateEditViewUpdateTiles(data.edit_width, data.edit_height, data.edit_scale);
	}

	dom.edit_frame.style.backgroundColor = dom.dom_canvas_bg_color.value;

	window.requestAnimationFrame(UpdateView);
}


function Initialize() {
	dom.Initialize();
	const edit_reader: FileReader = new FileReader();
	ResizeCanvas('edit', 256, 192);
	FitDivWidth('editframe', 'editblock');
	dom.edit_canvas.addEventListener('mousedown', MouseDownCallback);
	dom.edit_canvas.addEventListener('mouseup', MouseUpCallback);
	dom.edit_canvas.addEventListener('contextmenu', MouseDownCallback);
	dom.edit_canvas.addEventListener('mousemove', MouseMoveCallback);

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
		edit_reader.readAsBinaryString((<HTMLInputElement>event.target).files[0]);
	})
	dom.view_index.addEventListener('change', (event) => {
		data.TouchEditView();
	});
	dom.view_grid.addEventListener('change', (event) => {
		data.TouchEditView();
	});
	dom.dom_grid_color.addEventListener('input', (event) => {
		data.TouchEditView();
	});
	dom.dom_pen_tool.addEventListener('change', (event) => {
		tool = pen_tool;
	});
	dom.dom_paint_tool.addEventListener('change', (event) => {
		tool = paint_tool;
	});
	dom.save_picture_button.addEventListener('click', DownloadEditData);

	edit_reader.addEventListener('load', (event) => {
		LoadEditData((<FileReader>event.target).result as string);
		const basename = ExtractBaseName(GetHtmlElement<HTMLInputElement>('edit_filepath').value);
		GetHtmlElement<HTMLInputElement>('edit_data_name').value = basename;
		data.TouchEditView();
	});

	dom.blank_frame.innerHTML = MakeTable('color_palette', 16, 16);
	for (let i = 0; i < 256; i++) {
		const cell_id = `color_palette#${i}`;
		const color_cell = document.getElementById(cell_id);
		color_cell.style.backgroundColor = `#000000`;
		AddListener(cell_id, 'click', () => {
			data.selected_color_index = i;
			dom.palette_color.value = RgbStringToHexColor(color_cell.style.backgroundColor);
		});
	}
	dom.palette_color.addEventListener('input', (event) => {
		const cell_id = `color_palette#${data.selected_color_index}`;
		document.getElementById(cell_id).style.backgroundColor = (<HTMLInputElement>event.target).value;
		data.TouchEditView();
	});

	window.requestAnimationFrame(UpdateView);
}

const MakeSaveDataBlobAsJson = function () {
	const save_data = data.MakeRawSaveData();
	const save_data_json = JSON.stringify(save_data);
	const save_data_blob = new Blob([save_data_json], {
		type: 'application/json'
	});
	return save_data_blob;
};

class SaveData {
	filename: string;
	blob: Blob;
	constructor(filename: string, blob: Blob) {
		this.filename = filename;
		this.blob = blob;
	}
}

const MakeSaveData = function (basename: string, save_format: string): SaveData {
	switch (save_format) {
		case "JSON":
		default:
			return new SaveData(`${basename}.json`, MakeSaveDataBlobAsJson());
	}
};

function DownloadEditData() {
	const basename = GetHtmlElement<HTMLInputElement>('edit_data_name').value;
	const save_format = GetHtmlElement<HTMLSelectElement>('edit_save_format').value;
	const savedata = MakeSaveData(basename, save_format)
	const object_url = window.URL.createObjectURL(savedata.blob);
	const user_agent = window.navigator.userAgent.toLowerCase();
	const download_link = document.getElementById('download_edit_data');
	download_link.setAttribute('href', object_url);
	download_link.setAttribute('download', savedata.filename);
}

Initialize();
