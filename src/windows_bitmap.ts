namespace WindowsIndexColorBitmap {
	const bmp_file_header_size = 14;
	const bmp_info_header_size = 40;
	const palette_size = 4 * 256;
	const pixels_offset = bmp_file_header_size + bmp_info_header_size + palette_size;

	const Store16LE = function (bytes: Uint8Array, offset: number, value: number): void {
		bytes[offset + 0] = value & 0x00ff;
		bytes[offset + 1] = (value >> 8) & 0x00ff;
	}
	const Store32LE = function (bytes: Uint8Array, offset: number, value: number): void {
		bytes[offset + 0] = value & 0x000000ff;
		bytes[offset + 1] = (value >> 8) & 0x000000ff;
		bytes[offset + 2] = (value >> 16) & 0x000000ff;
		bytes[offset + 3] = (value >> 24) & 0x000000ff;
	}
	const Load16LE = function (bytes: Uint8Array, offset: number): number {
		return (bytes[offset + 0] & 0x00ff) | ((bytes[offset + 1] << 8) & 0xff00);
	}
	const Load32LE = function (bytes: Uint8Array, offset: number): number {
		return (bytes[offset + 0] & 0x000000ff)
			| ((bytes[offset + 1] << 8) & 0x0000ff00)
			| ((bytes[offset + 2] << 16) & 0x00ff0000)
			| ((bytes[offset + 3] << 14) & 0xff000000);
	}

	const RgbStringToRgbValues = function (rgb_string: string) {
		const [r_string, g_string, b_string] = rgb_string.split('(')[1].split(')')[0].split(',');
		return [Number(r_string), Number(g_string), Number(b_string)];
	}


	export function Serialize(
		color_palette: string[], pixels: number[][], width: number, height: number)
		: Uint8Array {
		const bmp_width = Math.ceil(width / 4) * 4;
		const pixels_size = bmp_width * height;
		const binary_size = bmp_file_header_size + bmp_info_header_size + palette_size + pixels_size;
		const buffer = new ArrayBuffer(binary_size);
		const bytes = new Uint8Array(buffer);
		bytes[0] = 0x42;
		bytes[1] = 0x4d;
		/* Bitmap File Header */
		Store32LE(bytes, 2, binary_size);
		Store16LE(bytes, 6, 0);
		Store16LE(bytes, 8, 0);
		Store32LE(bytes, 10, pixels_offset);

		/* Bitmap Info Header */
		Store32LE(bytes, 14, 40);
		Store32LE(bytes, 18, width);
		Store32LE(bytes, 22, height);
		Store16LE(bytes, 26, 1);
		Store16LE(bytes, 28, 8);
		Store32LE(bytes, 30, 0);
		Store32LE(bytes, 34, pixels_size);
		Store32LE(bytes, 38, 0);
		Store32LE(bytes, 42, 0);
		Store32LE(bytes, 46, 256);
		Store32LE(bytes, 50, 256);

		/* Color palette */
		for (let i = 0; i < 256; i++) {
			const [r, g, b] = RgbStringToRgbValues(color_palette[i]);
			bytes[54 + 4 * i + 0] = b;
			bytes[54 + 4 * i + 1] = g;
			bytes[54 + 4 * i + 2] = r;
			bytes[54 + 4 * i + 3] = 0;
		}

		/* pixels */
		/* ラスタ座標系から数学座標系に入れ替えて出力する */
		for (let h = 0; h < height; h++) {
			for (let w = 0; w < width; w++) {
				let offset = pixels_offset + bmp_width * (height - h - 1) + w;
				bytes[offset] = pixels[h][w];
			}
		}
		return bytes;
	}
	export function Deserialize(buffer: ArrayBuffer): [string[], number[][], number, number] | null {
		const bytes = new Uint8Array(buffer);
		console.log(bytes[0]);
		console.log(bytes[1]);
		if (bytes[0] != 0x42) {
			return null;
		}
		if (bytes[1] != 0x4d) {
			return null;
		}
		if (Load32LE(bytes, 10) != pixels_offset) {
			return null;
		}
		if (Load16LE(bytes, 26) != 1) {
			return null;
		}
		if (Load16LE(bytes, 28) != 8) {
			return null;
		}
		const width = Load32LE(bytes, 18);
		const height = Load32LE(bytes, 22);
		const bmp_width = Math.ceil(width / 4) * 4;
		const pixels_size = bmp_width * height;
		if (Load32LE(bytes, 34) != pixels_size) {
			return null;
		}

		const color_palette: string[] = new Array<string>(256);
		for (let i = 0; i < 256; i++) {
			const b = bytes[54 + 4 * i + 0];
			const g = bytes[54 + 4 * i + 1];
			const r = bytes[54 + 4 * i + 2];
			color_palette[i] = `rgb(${r},${g},${b})`;
		}
		/* pixels */
		/* 数学座標系からラスタ座標系に入れ替えて読みこむ */
		const pixels: number[][] = Misc.Make2dArray<number>(width, height, 0);
		for (let h = 0; h < height; h++) {
			for (let w = 0; w < width; w++) {
				let offset = pixels_offset + bmp_width * (height - h - 1) + w;
				pixels[h][w] = bytes[offset];
			}
		}
		return [color_palette, pixels, width, height];
	}
}