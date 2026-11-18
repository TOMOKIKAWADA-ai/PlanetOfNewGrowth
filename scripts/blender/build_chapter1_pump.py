# Builds the chapter 1 water pump (B1-7) from primitives: a hand-made landmark, no generator involved.
# Usage: blender -b --factory-startup -P scripts/blender/build_chapter1_pump.py -- <out.glb> [<preview.png>]
# Blender Z-up / -Y forward; glTF export converts to Y-up. Ground contact at the origin, about 2.4 units tall.
# The node named "PumpRotor" (the flywheel) is spun by the game; "PumpGlow" carries the cyan water light.
import math
import sys

import bpy

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
out_glb = argv[0] if argv else 'assets/background/chapter1_pump.glb'
preview = argv[1] if len(argv) > 1 else None

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def material(name, color, roughness=0.75, metallic=0.0, emission=None, strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1)
        bsdf.inputs['Emission Strength'].default_value = strength
    mat.diffuse_color = (*color, 1)
    return mat


CONCRETE = material('Concrete', (0.17, 0.17, 0.155), 0.95)  # dark enough to sit on the weathered asphalt
MOSS = material('Moss', (0.12, 0.2, 0.05), 1.0)
PAINT = material('PumpPaint', (0.07, 0.19, 0.19), 0.7, 0.3)       # weathered teal paint
MOTOR = material('Motor', (0.13, 0.14, 0.15), 0.55, 0.5)
PIPE = material('Pipe', (0.22, 0.24, 0.25), 0.6, 0.6)
RUST = material('Rust', (0.36, 0.17, 0.08), 0.9, 0.2)
VALVE = material('Valve', (0.72, 0.10, 0.06), 0.5, 0.2)            # the red handwheel reads from the bird camera
GLOW = material('Glow', (0.02, 0.85, 0.9), 0.3, 0.0, (0.01, 0.97, 1.0), 2.5)


def finish(obj, mat, name, smooth=False):
    obj.name = name
    obj.data.materials.append(mat)
    if smooth:
        bpy.ops.object.shade_smooth()
    return obj


def box(name, mat, size, loc):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.active_object
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)
    return finish(obj, mat, name)


def cylinder(name, mat, radius, depth, loc, rot=(0, 0, 0), verts=20):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=loc, rotation=rot)
    return finish(bpy.context.active_object, mat, name, smooth=True)


def torus(name, mat, major, minor, loc, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=24, minor_segments=8,
                                     location=loc, rotation=rot)
    return finish(bpy.context.active_object, mat, name, smooth=True)


parts = []
# Concrete pad with a chipped corner block and moss on top.
parts.append(box('Pad', CONCRETE, (3.0, 2.2, 0.28), (0, 0, 0.14)))
parts.append(box('PadStep', CONCRETE, (0.9, 0.6, 0.16), (-1.0, -1.25, 0.08)))
parts.append(box('MossA', MOSS, (0.9, 0.5, 0.03), (1.0, 0.75, 0.29)))
parts.append(box('MossB', MOSS, (0.5, 0.7, 0.03), (-1.2, 0.6, 0.29)))
parts.append(box('MossC', MOSS, (0.7, 0.35, 0.03), (0.9, -0.85, 0.29)))
parts.append(box('MossD', MOSS, (0.35, 0.3, 0.12), (-1.35, -0.85, 0.2)))

# Pump volute (horizontal drum) and its feet.
parts.append(cylinder('Volute', PAINT, 0.62, 0.7, (-0.45, 0, 0.95), (0, math.pi / 2, 0), 28))
parts.append(cylinder('VoluteCap', RUST, 0.5, 0.74, (-0.45, 0, 0.95), (0, math.pi / 2, 0), 28))
parts.append(box('Feet', PAINT, (0.8, 0.9, 0.32), (-0.45, 0, 0.44)))
# Motor with cooling ribs and a coupling to the pump.
parts.append(cylinder('Motor', MOTOR, 0.42, 0.95, (0.6, 0, 0.82), (0, math.pi / 2, 0), 24))
for i in range(5):
    parts.append(cylinder(f'Rib{i}', MOTOR, 0.46, 0.05, (0.25 + i * 0.17, 0, 0.82), (0, math.pi / 2, 0), 24))
parts.append(box('MotorBase', MOTOR, (1.0, 0.7, 0.14), (0.6, 0, 0.35)))
parts.append(cylinder('Coupling', RUST, 0.16, 0.3, (0.0, 0, 0.88), (0, math.pi / 2, 0), 12))

# Discharge pipe: up from the volute, over, and down into the ground behind the pad ("the pipe that sends the water").
parts.append(cylinder('RiserPipe', PIPE, 0.2, 1.1, (-0.45, 0, 1.95), verts=16))
parts.append(torus('RiserFlange', RUST, 0.21, 0.05, (-0.45, 0, 1.55)))
parts.append(cylinder('TopPipe', PIPE, 0.2, 1.3, (-0.45, 0.65, 2.45), (math.pi / 2, 0, 0), 16))
parts.append(cylinder('Elbow', PIPE, 0.22, 0.44, (-0.45, 0, 2.45), (math.pi / 2, 0, 0), 16))
parts.append(cylinder('DownPipe', PIPE, 0.2, 2.45, (-0.45, 1.3, 1.25), verts=16))
parts.append(cylinder('Elbow2', PIPE, 0.22, 0.44, (-0.45, 1.3, 2.45), (math.pi / 2, 0, 0), 16))
parts.append(torus('DownFlange', RUST, 0.21, 0.05, (-0.45, 1.3, 0.35)))
# Intake pipe running along the ground off the front of the pad.
parts.append(cylinder('IntakePipe', PIPE, 0.22, 1.6, (-2.1, 0, 0.6), (0, math.pi / 2, 0), 16))
parts.append(torus('IntakeFlange', RUST, 0.23, 0.05, (-1.3, 0, 0.6), (0, math.pi / 2, 0)))
parts.append(box('IntakeSupport', CONCRETE, (0.3, 0.5, 0.42), (-2.4, 0, 0.21)))

# Red handwheel valve on top of the riser, laid flat so it reads from above.
parts.append(cylinder('ValveStem', RUST, 0.05, 0.4, (-0.45, -0.45, 1.75), verts=8))
parts.append(cylinder('ValveBody', PIPE, 0.14, 0.24, (-0.45, -0.45, 1.5), verts=12))
parts.append(torus('ValveWheel', VALVE, 0.34, 0.05, (-0.45, -0.45, 1.95)))
parts.append(box('ValveSpokeX', VALVE, (0.66, 0.06, 0.05), (-0.45, -0.45, 1.95)))
parts.append(box('ValveSpokeY', VALVE, (0.06, 0.66, 0.05), (-0.45, -0.45, 1.95)))

# Cyan water gauge: a glass window on the volute that glows while the pump runs.
parts.append(cylinder('Glow', GLOW, 0.24, 0.06, (-0.45, -0.66, 0.95), (math.pi / 2, 0, 0), 20))
parts.append(torus('GaugeRim', RUST, 0.25, 0.04, (-0.45, -0.68, 0.95), (math.pi / 2, 0, 0)))

# Join the static parts into one mesh (one draw per material), keep rotor and glow separate.
bpy.ops.object.select_all(action='DESELECT')
glow = bpy.data.objects['Glow']
for obj in parts:
    if obj is not glow:
        obj.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
body = bpy.context.active_object
body.name = 'PumpBody'

# Flywheel at the motor's back end: spokes + rim, spun around its own axis (X) by the game.
rotor_parts = [torus('RotorRim', RUST, 0.48, 0.06, (0, 0, 0), (0, math.pi / 2, 0)),
               cylinder('RotorHub', MOTOR, 0.1, 0.16, (0, 0, 0), (0, math.pi / 2, 0), 12)]
for i in range(4):
    spoke = box(f'RotorSpoke{i}', MOTOR, (0.06, 0.9, 0.08), (0, 0, 0))
    spoke.rotation_euler = (i * math.pi / 4, 0, 0)
    bpy.ops.object.select_all(action='DESELECT')
    spoke.select_set(True)
    bpy.context.view_layer.objects.active = spoke
    bpy.ops.object.transform_apply(rotation=True)
    rotor_parts.append(spoke)
bpy.ops.object.select_all(action='DESELECT')
for obj in rotor_parts:
    obj.select_set(True)
bpy.context.view_layer.objects.active = rotor_parts[0]
bpy.ops.object.join()
rotor = bpy.context.active_object
rotor.name = 'PumpRotor'
rotor.location = (1.2, 0, 0.82)
glow.name = 'PumpGlow'

tris = 0
for obj in (body, rotor, glow):
    obj.data.calc_loop_triangles()
    tris += len(obj.data.loop_triangles)
print(f'pump triangles: {tris}')

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out_glb, export_format='GLB', use_selection=True, export_yup=True)
print(f'wrote {out_glb}')

if preview:
    from mathutils import Vector
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.color_type = 'MATERIAL'
    scene.display.shading.light = 'STUDIO'
    scene.render.resolution_x = 640
    scene.render.resolution_y = 480
    # Three-quarter view and a near top-down view (the game's cameras look down from high above).
    for suffix, location in (('', (5.2, -6.0, 5.2)), ('-top', (1.2, -2.6, 11.0))):
        cam = bpy.data.objects.new('Cam' + suffix, bpy.data.cameras.new('Cam' + suffix))
        scene.collection.objects.link(cam)
        cam.location = location
        cam.rotation_euler = (Vector((0, 0, 1.0)) - Vector(location)).to_track_quat('-Z', 'Y').to_euler()
        scene.camera = cam
        scene.render.filepath = preview.replace('.png', suffix + '.png')
        bpy.ops.render.render(write_still=True)
        print(f'wrote {scene.render.filepath}')
