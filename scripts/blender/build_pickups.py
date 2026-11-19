# Hand-built pickup meshes (backlog B1-1, 2026-11-19). No generated images or models: the shapes follow the ideas picked
# on 2026-10-26/29 (red berry, water-drop seed, amber shard, closed bud, horseshoe stone, arrowhead seed) and are
# modelled from primitives here, so there is no license question. Same output contract as prep-pickups.py:
# one mesh per file, centered, longest side 1, no materials (the game colors them from PICKUP_SPECS).
#   blender -b --python scripts/blender/build_pickups.py -- <outDir> <preview.png>
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

args = sys.argv[sys.argv.index('--') + 1:]
out_dir, preview = args[0], args[1]
os.makedirs(out_dir, exist_ok=True)

COLORS = {
    'hp': (1.0, 0.37, 0.43), 'mp': (0.39, 0.66, 1.0), 'burst': (1.0, 0.81, 0.33),
    'magnet': (0.73, 0.53, 1.0), 'shield': (0.73, 0.99, 0.95), 'speed': (0.87, 1.0, 0.45)
}


def clear():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh)


def obj_from_bmesh(bm, name):
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def sphere(name, radius=0.5, segments=16, rings=10, deform=None):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segments, v_segments=rings, radius=radius)
    if deform:
        for v in bm.verts:
            v.co = deform(v.co.copy())
    return obj_from_bmesh(bm, name)


def sweep(name, path, radius, sides=10, caps=True):
    """Tube of a circle (radius may be a function of t in 0..1) along a polyline."""
    bm = bmesh.new()
    rings = []
    n = len(path)
    for i, p in enumerate(path):
        p = Vector(p)
        a = Vector(path[max(0, i - 1)])
        b = Vector(path[min(n - 1, i + 1)])
        tangent = (b - a).normalized()
        side = tangent.cross(Vector((0, 1, 0)))
        if side.length < 1e-4:
            side = tangent.cross(Vector((1, 0, 0)))
        side.normalize()
        up = side.cross(tangent).normalized()
        r = radius(i / (n - 1)) if callable(radius) else radius
        ring = []
        for k in range(sides):
            ang = 2 * math.pi * k / sides
            ring.append(bm.verts.new(p + (side * math.cos(ang) + up * math.sin(ang)) * r))
        rings.append(ring)
    for i in range(n - 1):
        for k in range(sides):
            k2 = (k + 1) % sides
            bm.faces.new((rings[i][k], rings[i][k2], rings[i + 1][k2], rings[i + 1][k]))
    if caps:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_from_bmesh(bm, name)


def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = name
    return obj


def place(obj, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    obj.matrix_world = Matrix.LocRotScale(Vector(loc), Matrix.Rotation(rot[2], 3, 'Z') @ Matrix.Rotation(rot[1], 3, 'Y')
                                          @ Matrix.Rotation(rot[0], 3, 'X'), Vector(scale))
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


def cone(name, r1, r2, depth, verts):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=verts, radius1=r1, radius2=r2, depth=depth)
    return obj_from_bmesh(bm, name)


# --- shapes -------------------------------------------------------------------------------------------------------

def build_hp():
    # A plump berry, slightly flattened, with a dimple on top, a short stem and one curled leaf.
    def berry(co):
        co.z *= 0.88
        if co.z > 0.3:
            co.z -= (co.z - 0.3) * 0.5  # dimple
        return co
    body = sphere('berry', 0.5, 18, 12, berry)
    stem = sweep('stem', [(0, 0, 0.33), (0.02, 0, 0.45), (0.06, 0, 0.55)], 0.035, 6)
    leaf_path = [(0.05, 0, 0.5), (0.18, 0.02, 0.6), (0.33, 0.03, 0.62), (0.45, 0.03, 0.55)]
    leaf = sweep('leaf', leaf_path, lambda t: 0.02 + 0.09 * math.sin(math.pi * t), 8)
    place(leaf, scale=(1, 1, 1))
    # flatten the leaf into a blade
    for v in leaf.data.vertices:
        v.co.y *= 0.3
    return join([body, stem, leaf], 'pickup_hp')


def build_mp():
    # A water-drop seed: round bottom pulled to a point on top, with a small seam ring.
    def drop(co):
        h = co.z / 0.5  # -1..1
        if h > 0:
            k = (1 - h) ** 1.3
            co.x *= 0.15 + 0.85 * k
            co.y *= 0.15 + 0.85 * k
            co.z = h * 0.85
        return co
    body = sphere('drop', 0.5, 16, 14, drop)
    ring = sweep('seam', [(0.47 * math.cos(a), 0.47 * math.sin(a), -0.02) for a in
                          [2 * math.pi * i / 24 for i in range(25)]], 0.03, 6, caps=False)
    return join([body, ring], 'pickup_mp')


def build_burst():
    # A cluster of amber crystal shards: one tall hexagonal point and two smaller leaning ones.
    def shard(name, r, h, tip, loc, rot):
        prism = cone(name + 'p', r, r * 0.92, h, 6)
        place(prism, loc=(0, 0, h / 2))
        point = cone(name + 't', r * 0.92, 0.0, tip, 6)
        place(point, loc=(0, 0, h + tip / 2))
        s = join([prism, point], name)
        place(s, loc=loc, rot=rot)
        return s
    a = shard('a', 0.2, 0.55, 0.3, (0, 0, -0.2), (0.05, -0.05, 0))
    b = shard('b', 0.13, 0.3, 0.2, (0.2, 0.05, -0.22), (0, 0.65, 0.3))
    c = shard('c', 0.11, 0.25, 0.18, (-0.17, -0.1, -0.22), (0.3, -0.7, -0.4))
    base = sphere('base', 0.22, 8, 5, lambda co: Vector((co.x * 1.4, co.y * 1.1, co.z * 0.45 - 0.22)))
    return join([a, b, c, base], 'pickup_burst')


def build_shield():
    # A closed bud: five thick petals wrapped around a core, tips leaning in, with a short stalk.
    parts = [sphere('core', 0.3, 12, 8, lambda co: Vector((co.x, co.y, co.z * 1.4 + 0.05)))]
    for i in range(5):
        ang = 2 * math.pi * i / 5
        petal = sphere(f'petal{i}', 0.5, 12, 8, lambda co: Vector((co.x * 0.56, co.y * 0.22, co.z)))
        # bend the petal inward at the top (cupped)
        for v in petal.data.vertices:
            t = (v.co.z + 0.5)
            v.co.y -= 0.18 * t * t
        place(petal, loc=(math.cos(ang) * 0.18, math.sin(ang) * 0.18, 0.05), rot=(0.0, 0.0, ang + math.pi / 2))
        # lean the tip toward the axis
        for v in petal.data.vertices:
            t = max(0.0, v.co.z + 0.2)
            v.co.x -= math.cos(ang) * 0.24 * t
            v.co.y -= math.sin(ang) * 0.24 * t
        parts.append(petal)
    stalk = sweep('stalk', [(0, 0, -0.45), (0, 0, -0.62)], 0.07, 8)
    return join(parts + [stalk], 'pickup_shield')


def build_magnet():
    # A chunky horseshoe stone, standing up in the XZ plane (the game lays magnets flat, so it reads as a U from above).
    arc = [(-0.32 * math.cos(a), 0, -0.1 + 0.32 * math.sin(a)) for a in [math.pi * i / 14 for i in range(1, 14)]]
    right = [(0.32, 0, -0.1 - 0.1 * i) for i in range(5)]
    # path: down the left prong's bottom -> up -> over the arc -> down the right prong
    left_up = [(-0.32, 0, -0.5 + 0.1 * i) for i in range(5)]
    tube = sweep('horseshoe', left_up + arc + right, 0.15, 12)
    tips = []
    for x in (-0.32, 0.32):  # rounded, slightly wider pole ends
        tips.append(sphere(f'tip{x}', 0.16, 12, 8, lambda co, x=x: Vector((co.x + x, co.y, co.z * 0.6 - 0.5))))
    return join([tube] + tips, 'pickup_magnet')


def build_speed():
    # An arrowhead seed: plump three-lobed back pulled to a sharp point (+Z; the game lays it on its side and spins it).
    def seed(co):
        h = co.z / 0.5
        ang = math.atan2(co.y, co.x)
        lobe = 1 + 0.18 * math.cos(3 * ang)
        k = ((1 - h) / 2) ** 0.75 if h > -1 else 0
        k = min(1.0, k * 1.35)
        co.x *= lobe * k * 0.75
        co.y *= lobe * k * 0.75
        co.z = h * 0.6 + (0.05 if h > 0 else 0)
        return co
    body = sphere('seed', 0.5, 18, 14, seed)
    return join([body], 'pickup_speed')


BUILDERS = {'hp': build_hp, 'mp': build_mp, 'burst': build_burst, 'shield': build_shield,
            'magnet': build_magnet, 'speed': build_speed}

done = []
for key, build in BUILDERS.items():
    clear()
    obj = build()
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if key == 'burst':
        bpy.ops.object.shade_flat()
    else:
        bpy.ops.object.shade_smooth()
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
    obj.location = (0, 0, 0)
    obj.scale = (1 / max(obj.dimensions),) * 3
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    out = os.path.join(out_dir, f'pickup_{key}.glb')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_materials='NONE', export_yup=True)
    print(f'{key}: {tris} tris -> {out}')
    done.append(key)

# Preview: a row from the side and a row from above (the game camera looks down steeply).
clear()
for row, tilt in enumerate((0, 1)):
    for i, key in enumerate(done):
        bpy.ops.import_scene.gltf(filepath=os.path.join(out_dir, f'pickup_{key}.glb'))
        obj = bpy.context.selected_objects[0]
        obj.rotation_mode = 'XYZ'
        obj.location = ((i - (len(done) - 1) / 2) * 1.4, 0, 0.8 - row * 1.6)
        obj.rotation_euler = (math.radians(55) if tilt else 0, 0, math.radians(25))
        mat = bpy.data.materials.new(f'{key}{row}')
        mat.diffuse_color = (*COLORS[key], 1)
        obj.data.materials.append(mat)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.color_type = 'MATERIAL'
scene.display.shading.light = 'STUDIO'
scene.render.resolution_x = 240 * len(done)
scene.render.resolution_y = 520
cam_data = bpy.data.cameras.new('cam')
cam_data.type = 'ORTHO'
cam_data.ortho_scale = 1.4 * len(done)
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
cam.location = (0, -6, 0)
cam.rotation_euler = (math.radians(90), 0, 0)
scene.camera = cam
scene.render.filepath = preview
bpy.ops.render.render(write_still=True)
print('preview', preview)
