"""アニメ付きの GLB を読み、各クリップの数コマを正面と横から Workbench で描いて 1 枚に並べる（確認用）。

使い方:
  blender -b --factory-startup -P scripts/blender/render_anim_sheet.py -- <anim.glb> <出力.png> [コマ数]
行はクリップ（idle / walk / attack / hit / die）、列は「正面のコマ…｜横のコマ…」。
"""
import math
import os
import sys

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = args[0], args[1]
STEPS = int(args[2]) if len(args) > 2 else 4
CLIPS = ['idle', 'walk', 'attack', 'hit', 'die']
TILE = 260

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps = 30
bpy.ops.import_scene.gltf(filepath=SRC)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
meshes = [o for o in bpy.data.objects if o.type == "MESH" and o.find_armature()]
for o in bpy.data.objects:
    if o.type == "MESH" and not o.find_armature():
        o.hide_render = True
ad = arm.animation_data_create()
for track in list(ad.nla_tracks):
    ad.nla_tracks.remove(track)

pts = [m.matrix_world @ v.co for m in meshes for v in m.data.vertices]
mn = Vector((min(p[i] for p in pts) for i in range(3)))
mx = Vector((max(p[i] for p in pts) for i in range(3)))
size = max(mx - mn) * 1.25
ctr = (mn + mx) / 2

sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'
sc.world = bpy.data.worlds.new('bg')
sc.world.color = (0.55, 0.58, 0.62)
sc.display.shading.light = 'STUDIO'
sc.display.shading.color_type = 'TEXTURE'
sc.render.resolution_x = sc.render.resolution_y = TILE
cam_data = bpy.data.cameras.new('cam')
cam_data.type = 'ORTHO'
cam_data.ortho_scale = size
cam = bpy.data.objects.new('cam', cam_data)
sc.collection.objects.link(cam)
sc.camera = cam
VIEWS = [((0, -1, 0), (90, 0, 0)), ((1, 0, 0), (90, 0, 90))]

tmp = os.path.join(os.path.dirname(os.path.abspath(OUT)), '_sheet_tmp')
os.makedirs(tmp, exist_ok=True)
files = []
for clip in CLIPS:
    action = bpy.data.actions.get(clip)
    row = []
    if action is None:
        files.append(row)
        continue
    ad.action = action
    if hasattr(ad, 'action_slot') and action.slots:
        ad.action_slot = action.slots[0]
    start, end = action.frame_range
    for vi, (d, rot) in enumerate(VIEWS):
        cam.location = ctr + Vector(d) * size * 3
        cam.rotation_euler = tuple(math.radians(r) for r in rot)
        for k in range(STEPS):
            frame = start + (end - start) * k / max(1, STEPS - 1)
            sc.frame_set(int(round(frame)))
            path = os.path.join(tmp, f'{clip}_{vi}_{k}.png')
            sc.render.filepath = path
            bpy.ops.render.render(write_still=True)
            row.append(path)
    files.append(row)

# 1 枚に並べる（PIL が無い Blender でも動くよう、bpy の画像で合成する）
cols = STEPS * 2
W, H = TILE * cols, TILE * len(CLIPS)
sheet = bpy.data.images.new('sheet', W, H, alpha=False)
pixels = [0.15] * (W * H * 4)
for r, row in enumerate(files):
    for col, path in enumerate(row):
        img = bpy.data.images.load(path)
        src = list(img.pixels)
        y0 = (len(CLIPS) - 1 - r) * TILE
        x0 = col * TILE
        for y in range(TILE):
            dst = ((y0 + y) * W + x0) * 4
            pixels[dst:dst + TILE * 4] = src[y * TILE * 4:(y + 1) * TILE * 4]
        bpy.data.images.remove(img)
sheet.pixels = pixels
sheet.filepath_raw = OUT
sheet.file_format = 'PNG'
sheet.save()
for row in files:
    for path in row:
        os.remove(path)
os.rmdir(tmp)
print('SHEET', OUT)
