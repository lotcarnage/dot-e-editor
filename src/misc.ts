namespace Misc {
	export function Make2dArray<T>(width: number, height: number, initial_value: T): T[][] {
		return JSON.parse(JSON.stringify((new Array<Array<T>>(height)).fill((new Array<T>(width)).fill(initial_value))));
	}
	export function LineTo2d(x0: number, y0: number, x1: number, y1: number, PixelOnLineCallback: (x: number, y: number) => void) {
		const dx = (x0 < x1) ? x1 - x0 : x0 - x1;
		const dy = (y0 < y1) ? y1 - y0 : y0 - y1;
		const sx = (x0 < x1) ? 1 : -1;
		const sy = (y0 < y1) ? 1 : -1;
		let e1 = dx - dy;

		for (; ;) {
			PixelOnLineCallback(x0, y0);
			if ((x0 == x1) && (y0 == y1)) {
				break;
			}
			const e2 = e1 * 2;
			if (-dy < e2) {
				e1 -= dy;
				x0 += sx;
			}
			if (e2 < dx) {
				e1 += dx;
				y0 += sy;
			}
		}
	};
	export function RgbStringToHexColor(rgb_string: string) {
		const [r_string, g_string, b_string] = rgb_string.split('(')[1].split(')')[0].split(',');
		const r_hex = ('00' + Number(r_string).toString(16)).slice(-2);
		const g_hex = ('00' + Number(g_string).toString(16)).slice(-2);
		const b_hex = ('00' + Number(b_string).toString(16)).slice(-2);
		return `#${r_hex}${g_hex}${b_hex}`;
	}
	export function ExtractBaseName(filepath: string) {
		const path_delimiter = /\\/g;
		const path_tokens = filepath.slice(0).replace(path_delimiter, '/').split('/');
		const filename = (2 <= path_tokens.length) ? path_tokens[path_tokens.length - 1] : path_tokens[0];
		const name_tokens = filename.split('.');
		const basename = (2 <= name_tokens.length) ? name_tokens.splice(0, name_tokens.length - 1).join('.') : name_tokens[0];
		return basename;
	}
	export function MakeWebSafeColorList(): string[] {
		const gray_colors = Array<string>(0); /* 利便性のためにグレースケールだけ別で並べる */
		const other_colors = Array<string>(0);
		const blank_colors = Array<string>(256 - (6 * 6 * 6)).fill('#000000');
		const c = ['00', '33', '66', '99', 'cc', 'ff'];
		let i = 0;
		for (let b = 0; b < 6; b++) {
			for (let g = 0; g < 6; g++) {
				for (let r = 0; r < 6; r++) {
					const color = `#${c[r]}${c[g]}${c[b]}`;
					if (r == g && r == b) {
						gray_colors.push(color);
					} else {
						other_colors.push(color);
					}
				}
			}
		}
		return gray_colors.concat(other_colors).concat(blank_colors);
	}
}
