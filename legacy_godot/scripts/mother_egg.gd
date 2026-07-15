extends "res://scripts/egg.gd"
class_name MotherEgg

func configure(game_ref, config_ref, start_age: float = 0.0) -> void:
	game = game_ref
	config = config_ref
	is_mother = true
	max_hp = config.mother_egg_hp
	hp = max_hp
	age = start_age
	mature = true
	hatch_timer = 999.0
	spread_timer = 999.0
	_apply_mother_visuals()

func _ready() -> void:
	is_mother = true
	super._ready()
	_apply_mother_visuals()

func _physics_process(_delta: float) -> void:
	pass

func _apply_mother_visuals() -> void:
	if body_mesh == null:
		return
	var material: StandardMaterial3D = StandardMaterial3D.new()
	material.albedo_color = Color(0.72, 0.1, 0.24)
	material.emission_enabled = true
	material.emission = Color(1.0, 0.12, 0.25)
	material.emission_energy_multiplier = 2.0
	body_mesh.material_override = material
	body_mesh.scale = Vector3(2.15, 2.45, 2.15)
	if egg_asset_model != null:
		egg_asset_model.scale = Vector3(1.8, 2.15, 1.8)
		_apply_material_to_asset_model(egg_asset_model, material)
	if crown_mesh != null:
		var crown_material: StandardMaterial3D = _make_egg_material(Color(1.0, 0.24, 0.36), Color(1.0, 0.08, 0.18), 2.4, false)
		crown_mesh.material_override = crown_material
		crown_mesh.scale = Vector3(2.1, 2.0, 2.1)
	if vein_ring_mesh != null:
		vein_ring_mesh.material_override = _make_egg_material(Color(1.0, 0.18, 0.26), Color(1.0, 0.04, 0.12), 2.0, false)
		vein_ring_mesh.scale = Vector3(2.15, 2.15, 2.15)
	if ground_ring_mesh != null:
		ground_ring_mesh.material_override = _make_egg_material(Color(0.55, 0.04, 0.1, 0.5), Color(1.0, 0.05, 0.12), 1.3, true)
		ground_ring_mesh.scale = Vector3(2.05, 1.0, 2.05)
	for shard in shard_meshes:
		if shard != null:
			shard.visible = true
			shard.material_override = _make_egg_material(Color(1.0, 0.28, 0.36), Color(1.0, 0.05, 0.14), 1.6, false)
			shard.scale = Vector3(1.75, 1.75, 1.75)
	if stain_mesh != null:
		stain_mesh.scale = Vector3(2.3, 1.0, 2.3)
	if glow != null:
		glow.light_color = Color(1.0, 0.16, 0.22)
		glow.light_energy = 2.2
		glow.omni_range = 13.0
	if spores != null:
		spores.amount = 120
