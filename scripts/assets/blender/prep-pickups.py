# Shape-only Hunyuan3D GLBs -> small pickup GLBs (centered, longest side 1, decimated, no materials) + a preview render.
#   blender -b --python scripts/assets/blender/prep-pickups.py -- <inDir> <outDir> <preview.png> [targetTris]
import math
import os
import sys

import bpy

args = sys.argv[sys.argv.index('--') + 1:]
in_dir, out_dir, preview = args[0], args[1], args[2]
target_tris = int(args[3]) if len(args) > 3 else 1200
os.makedirs(out_dir, exist_ok=True)

# Colors only for the preview; the game paints pickups with its own flat materials (PICKUP_SPECS in src/entities.js).
COLORS = {
    'hp': (1.0, 0.37, 0.43), 'mp': (0.39, 0.66, 1.0), 'burst': (1.0, 0.81, 0.33),
    'magnet': (0.73, 0.53, 1.0), 'shield': (0.73, 0.99, 0.95), 'speed': (0.87, 1.0, 0.45)
}


def clear():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh)


def tri_count(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


done = []
for name in sorted(os.listdir(in_dir)):
    if not name.endswith('.glb'):
        continue
    clear()
    bpy.ops.import_scene.gltf(filepath=os.path.join(in_dir, name))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    before = tri_count(obj)
    mod = obj.modifiers.new('decimate', 'DECIMATE')
    mod.ratio = min(1.0, target_tris / max(1, before))
    bpy.ops.object.modifier_apply(modifier=mod.name)
    key = name.split('-')[0]
    if key == 'burst':
        bpy.ops.object.shade_flat()  # keep the crystal's facets
    else:
        bpy.ops.object.shade_smooth()
    obj.data.materials.clear()
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
    obj.location = (0, 0, 0)
    size = max(obj.dimensions)
    obj.scale = (1 / size,) * 3
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    out = os.path.join(out_dir, f'pickup_{key}.glb')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_materials='NONE', export_yup=True)
    print(f'{name}: {before} -> {tri_count(obj)} tris -> {out}')
    done.append(key)

# Preview: re-import the exported files in a row and render with Workbench.
clear()
for i, key in enumerate(done):
    bpy.ops.import_scene.gltf(filepath=os.path.join(out_dir, f'pickup_{key}.glb'))
    obj = bpy.context.selected_objects[0]
    obj.location.x = (i - (len(done) - 1) / 2) * 1.4
    obj.rotation_euler.z += math.radians(25)
    mat = bpy.data.materials.new(key)
    mat.diffuse_color = (*COLORS.get(key, (0.8, 0.8, 0.8)), 1)
    obj.data.materials.append(mat)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.color_type = 'MATERIAL'
scene.display.shading.light = 'STUDIO'
scene.render.resolution_x = 280 * max(1, len(done))
scene.render.resolution_y = 320
scene.render.film_transparent = False
scene.world = scene.world or bpy.data.worlds.new('w')
cam_data = bpy.data.cameras.new('cam')
cam_data.type = 'ORTHO'
cam_data.ortho_scale = 1.4 * max(1, len(done))
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
cam.location = (0, -6, 2.2)
cam.rotation_euler = (math.radians(72), 0, 0)
scene.camera = cam
scene.render.filepath = preview
bpy.ops.render.render(write_still=True)
print('preview', preview)
