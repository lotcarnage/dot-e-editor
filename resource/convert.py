import glob
import PIL.Image
import os.path
import numpy
import base64


def _optimize_palette(index_bmp_image: PIL.Image.Image):
    palette = index_bmp_image.getpalette()
    histogram = index_bmp_image.histogram()
    indices = numpy.array(index_bmp_image)
    conversion_pairs = []
    destination_index = 0
    for index, count in enumerate(histogram):
        if 0 < count:
            conversion_pairs.append((index, destination_index))
            destination_index += 1
    new_palette = []
    for conversion_pair in conversion_pairs:
        offset = conversion_pair[0] * 3
        new_palette.extend(palette[offset:offset + 3])
    conversion_map = numpy.zeros(256, dtype=int)
    for conversion_pair in conversion_pairs:
        conversion_map[conversion_pair[0]] = conversion_pair[1]
    new_indices = numpy.array([conversion_map[index] for index in indices], dtype=numpy.uint8)
    new_index_bmp_image = PIL.Image.fromarray(new_indices)
    new_index_bmp_image.putpalette(new_palette, rawmode="RGB")
    return new_index_bmp_image


def _read_bytes(filepath: str):
    with open(filepath, "rb") as bin_file:
        data = bin_file.read()
    return data


def _generate_typescript_resouce_table(resource_list: list[tuple[str, str]]):
    ts_filepath = os.path.join(os.path.dirname(__file__), "../src/resources.ts")
    with open(ts_filepath, "wt") as ts_file:
        ts_file.write('export namespace Resources {\n')
        for resource in resource_list:
            ts_file.write(f'\texport const {resource[0]} = "data:image/png;base64,{resource[1]}"\n')
        ts_file.write('}\n')
    return None


def _main_process():
    bmp_paths = glob.glob('*.bmp')
    for bmp_path in bmp_paths:
        bmp = PIL.Image.open(bmp_path)
        optimized_bmp = _optimize_palette(bmp)
        optimized_bmp.save(f'{os.path.splitext(bmp_path)[0]}.png', compress_level=9)
    png_paths = glob.glob('*.png')

    resource_list = [(os.path.splitext(os.path.basename(png_path))[0], base64.b64encode(_read_bytes(png_path)).decode()) for png_path in png_paths]
    _generate_typescript_resouce_table(resource_list)

    return None


if __name__ == "__main__":
    _main_process()
