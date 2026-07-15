extends Area3D
class_name Egg

const KENNEY_EGG_ASSET_PATH: String = "res://assets/kenney/graveyard/pumpkin-tall.glb"

var game
var config
var active: bool = true
var is_mother: bool = false
var max_hp: float = 42.0
var hp: float = 42.0
var age: float = 0.0
var mature: bool = false
var hatch_timer: float = 12.0
var spread_timer: float = 18.0
var predation_claimant

var body_mesh: MeshInstance3D
var egg_asset_model: Node3D
var stain_mesh: MeshInstance3D
var crown_mesh: MeshInstance3D
var vein_ring_mesh: MeshInstance3D
var ground_ring_mesh: MeshInstance3D
var shard_meshes: Array[MeshInstance3D] = []
var spores: GPUParticles3D
var glow: OmniLight3D

func configure(game_ref, config_ref, start_age: float = 0.0) -> void:
	game = game_ref
	config = config_ref
	is_mother = false
	max_hp = config.egg_max_hp
	hp = max_hp
	age = start_age
	mature = age >= config.egg_mature_time
	hatch_timer = randf_range(config.egg_hatch_min, config.egg_hatch_max)
	spread_timer = config.egg_spread_interval
	_apply_visual_state()

func _ready() -> void:
	_create_collision()
	_create_visuals()
	_apply_visual_state()

func _physics_process(delta: float) -> void:
	if not active or game == null or config == null or game.is_gameplay_paused():
		return
	if is_mother:
		return
	age += delta
	if not mature and age >= config.egg_mature_time:
		mature = true
		hatch_timer = randf_range(config.egg_hatch_min, config.egg_hatch_max)
		spread_timer = config.egg_spread_interval
		_apply_visual_state()
	if not mature:
		return
	hatch_timer -= delta * game.get_egg_hatch_speed_multiplier()
	spread_timer -= delta
	if hatch_timer <= 0.0:
		hatch_timer = randf_range(config.egg_hatch_min, config.egg_hatch_max)
		game.request_hatch(self)
	if spread_timer <= 0.0:
		spread_timer = config.egg_spread_interval
		game.request_spawn_child_egg(self)

func _create_collision() -> void:
	var collision: CollisionShape3D = CollisionShape3D.new()
	var shape: SphereShape3D = SphereShape3D.new()
	shape.radius = 0.9
	collision.shape = shape
	add_child(collision)

func _create_visuals() -> void:
	stain_mesh = MeshInstance3D.new()
	var stain: PlaneMesh = PlaneMesh.new()
	stain.size = Vector2(5.2, 5.2)
	stain_mesh.mesh = stain
	stain_mesh.position.y = -0.02
	var stain_material: StandardMaterial3D = StandardMaterial3D.new()
	stain_material.albedo_color = Color(0.08, 0.31, 0.16, 0.5)
	stain_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	stain_material.cull_mode = BaseMaterial3D.CULL_DISABLED
	stain_mesh.material_override = stain_material
	add_child(stain_mesh)

	ground_ring_mesh = MeshInstance3D.new()
	var ground_ring: TorusMesh = TorusMesh.new()
	ground_ring.inner_radius = 1.35
	ground_ring.outer_radius = 1.55
	ground_ring.ring_segments = 48
	ground_ring.rings = 6
	ground_ring_mesh.mesh = ground_ring
	ground_ring_mesh.position.y = 0.035
	ground_ring_mesh.material_override = _make_egg_material(Color(0.09, 0.42, 0.19, 0.42), Color(0.16, 0.85, 0.28), 0.45, true)
	add_child(ground_ring_mesh)

	body_mesh = MeshInstance3D.new()
	var body: SphereMesh = SphereMesh.new()
	body.radius = 0.82
	body.height = 1.35
	body.radial_segments = 32
	body.rings = 16
	body_mesh.mesh = body
	body_mesh.position.y = 0.62
	add_child(body_mesh)
	egg_asset_model = _instantiate_egg_asset()
	if egg_asset_model != null:
		body_mesh.visible = false
		add_child(egg_asset_model)

	crown_mesh = MeshInstance3D.new()
	var crown: SphereMesh = SphereMesh.new()
	crown.radius = 0.32
	crown.height = 0.42
	crown.radial_segments = 18
	crown.rings = 8
	crown_mesh.mesh = crown
	crown_mesh.position = Vector3(0.0, 1.28, 0.0)
	add_child(crown_mesh)

	vein_ring_mesh = MeshInstance3D.new()
	var vein_ring: TorusMesh = TorusMesh.new()
	vein_ring.inner_radius = 0.62
	vein_ring.outer_radius = 0.66
	vein_ring.ring_segments = 40
	vein_ring.rings = 5
	vein_ring_mesh.mesh = vein_ring
	vein_ring_mesh.position.y = 0.75
	vein_ring_mesh.rotation.x = deg_to_rad(18.0)
	add_child(vein_ring_mesh)

	_create_shell_shards()

	spores = GPUParticles3D.new()
	spores.amount = 42
	spores.lifetime = 1.8
	spores.emitting = true
	var spore_material: ParticleProcessMaterial = ParticleProcessMaterial.new()
	spore_material.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
	spore_material.emission_sphere_radius = 1.25
	spore_material.direction = Vector3(0.0, 1.0, 0.0)
	spore_material.spread = 85.0
	spore_material.gravity = Vector3(0.0, -0.35, 0.0)
	spore_material.initial_velocity_min = 0.15
	spore_material.initial_velocity_max = 1.0
	spore_material.scale_min = 0.03
	spore_material.scale_max = 0.09
	spore_material.color = Color(0.38, 1.0, 0.55, 0.45)
	spores.process_material = spore_material
	add_child(spores)

	glow = OmniLight3D.new()
	glow.light_color = Color(0.35, 1.0, 0.48)
	glow.light_energy = 0.45
	glow.omni_range = 6.0
	glow.position.y = 1.0
	add_child(glow)

func _instantiate_egg_asset() -> Node3D:
	var scene: PackedScene = load(KENNEY_EGG_ASSET_PATH) as PackedScene
	if scene == null:
		return null
	var root: Node3D = scene.instantiate() as Node3D
	if root == null:
		return null
	root.name = "KenneyEggModel"
	root.rotation.y = randf_range(0.0, TAU)
	return root

func _create_shell_shards() -> void:
	var shard_material: StandardMaterial3D = _make_egg_material(Color(0.72, 1.0, 0.48), Color(0.28, 1.0, 0.36), 0.55, false)
	for i in range(5):
		var shard: MeshInstance3D = MeshInstance3D.new()
		var shard_mesh: PrismMesh = PrismMesh.new()
		shard_mesh.size = Vector3(0.16, 0.48, 0.14)
		shard.mesh = shard_mesh
		var angle: float = TAU * float(i) / 5.0
		shard.position = Vector3(cos(angle) * 0.72, 0.72 + 0.12 * sin(float(i)), sin(angle) * 0.72)
		shard.rotation = Vector3(deg_to_rad(22.0), angle, deg_to_rad(8.0))
		shard.material_override = shard_material
		add_child(shard)
		shard_meshes.append(shard)

func _make_egg_material(albedo: Color, emission: Color, emission_energy: float, transparent: bool = false) -> StandardMaterial3D:
	var material: StandardMaterial3D = StandardMaterial3D.new()
	material.albedo_color = albedo
	material.roughness = 0.62
	if transparent:
		material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		material.cull_mode = BaseMaterial3D.CULL_DISABLED
	material.emission_enabled = true
	material.emission = emission
	material.emission_energy_multiplier = emission_energy
	return material

func _apply_visual_state() -> void:
	if body_mesh == null:
		return
	var growth: float = 1.0
	if config != null and not is_mother:
		growth = clampf(age / maxf(config.egg_mature_time, 0.1), 0.45, 1.0)
	var mature_color: Color = Color(0.54, 0.95, 0.35)
	var young_color: Color = Color(0.38, 0.52, 0.28)
	var color: Color = mature_color if mature or is_mother else young_color
	var emission: Color = Color(0.16, 0.75, 0.22) if not is_mother else Color(1.0, 0.22, 0.36)
	var material: StandardMaterial3D = _make_egg_material(color, emission, 0.55 if not is_mother else 1.4, false)
	body_mesh.material_override = material
	body_mesh.scale = Vector3(0.86, 1.0, 0.86) * growth
	if egg_asset_model != null:
		egg_asset_model.scale = Vector3(0.78, 0.95, 0.78) * growth
		_apply_material_to_asset_model(egg_asset_model, material)
	if crown_mesh != null:
		crown_mesh.material_override = _make_egg_material(Color(0.82, 1.0, 0.55) if not is_mother else Color(1.0, 0.26, 0.38), emission, 1.0 if mature or is_mother else 0.35, false)
		crown_mesh.scale = Vector3.ONE * growth
	if vein_ring_mesh != null:
		vein_ring_mesh.material_override = _make_egg_material(Color(0.22, 0.9, 0.24), emission, 1.15 if mature or is_mother else 0.45, false)
		vein_ring_mesh.scale = Vector3.ONE * growth
	if ground_ring_mesh != null:
		ground_ring_mesh.scale = Vector3.ONE * (0.65 + growth * 0.35)
	for i in range(shard_meshes.size()):
		var shard: MeshInstance3D = shard_meshes[i]
		if shard != null:
			shard.visible = mature or is_mother
			shard.scale = Vector3.ONE * growth
	if stain_mesh != null:
		stain_mesh.scale = Vector3.ONE * (0.75 + growth * 0.35)
	if glow != null:
		glow.light_energy = 0.32 if not mature else 0.62
	if spores != null:
		spores.amount = 24 if not mature else 52

func _apply_material_to_asset_model(root: Node, material: Material) -> void:
	if root is MeshInstance3D:
		(root as MeshInstance3D).material_override = material
	var mesh_nodes: Array = root.find_children("*", "MeshInstance3D", true, false)
	for node in mesh_nodes:
		var mesh_instance: MeshInstance3D = node as MeshInstance3D
		if mesh_instance != null:
			mesh_instance.material_override = material

func take_damage(amount: float) -> void:
	if not active:
		return
	hp -= amount
	body_mesh.scale = Vector3.ONE * (1.0 + clampf(amount / max_hp, 0.04, 0.22))
	if egg_asset_model != null:
		egg_asset_model.scale *= 1.0 + clampf(amount / max_hp, 0.03, 0.16)
	if hp <= 0.0:
		active = false
		predation_claimant = null
		if game != null:
			game.on_egg_destroyed(self)

func get_health_ratio() -> float:
	return hp / maxf(max_hp, 0.001)

func set_predation_claim(claimant) -> void:
	predation_claimant = claimant

func clear_predation_claim(claimant) -> void:
	if predation_claimant == claimant:
		predation_claimant = null

func can_be_predated_by(claimant) -> bool:
	if is_mother or not active:
		return false
	return predation_claimant == null or predation_claimant == claimant
