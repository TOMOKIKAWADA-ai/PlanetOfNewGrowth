extends CharacterBody3D
class_name PlayerController

const GameTypes = preload("res://scripts/game_types.gd")
const PLAYER_MODEL_PATH: String = "res://assets/models/Tsuyukusa_003rig.glb"
const SEED_MODEL_PATH: String = "res://assets/models/seed_001_ritpo.glb"
const COLLISION_LAYER_WORLD: int = 1
const COLLISION_LAYER_PLAYER: int = 2
const COLLISION_LAYER_AIR_PLAYER: int = 4
const COLLISION_LAYER_ENEMY: int = 8

var game
var config
var form: int = GameTypes.PlayerForm.HUMAN

var max_hp: float = 100.0
var hp: float = 100.0
var max_mp: float = 100.0
var mp: float = 100.0
var level: int = 1
var xp: int = 0
var xp_to_next: int = 18
var pending_level_ups: int = 0

var attack_damage: float = 10.0
var attack_interval: float = 0.75
var attack_range: float = 12.0
var projectile_speed: float = 18.0
var projectile_count: int = 1
var projectile_pierce: int = 0
var extra_move_speed: float = 0.0
var mp_regen_bonus: float = 0.0
var bird_cost_multiplier: float = 1.0
var dive_damage_multiplier: float = 1.0
var area_pulse_level: int = 0

var attack_timer: float = 0.0
var egg_special_timer: float = 0.0
var area_pulse_timer: float = 0.0
var dive_timer: float = 0.0
var q_was_down: bool = false
var dive_was_down: bool = false
var melee_cooldown_timer: float = 0.0
var melee_action_timer: float = 0.0
var melee_was_down: bool = false
var burst_was_down: bool = false
var invulnerable_timer: float = 0.0
var phase_timer: float = 0.0
var attack_lock_timer: float = 0.0
var burst_gauge: float = 0.0
var predation_target
var predation_timer: float = 0.0
var arm_aim_timer: float = 0.0
var arm_aim_direction: Vector3 = Vector3.FORWARD

var visual_root: Node3D
var model_instance: Node3D
var skeleton: Skeleton3D
var right_upper_arm_bone: int = -1
var right_forearm_bone: int = -1
var right_hand_bone: int = -1
var left_upper_arm_bone: int = -1
var left_forearm_bone: int = -1
var left_hand_bone: int = -1
var body_mesh: MeshInstance3D
var wing_mesh: MeshInstance3D
var seed_orbit_root: Node3D
var seed_scene: PackedScene
var seed_orbs: Array[Node3D] = []
var seed_fire_index: int = 0
var run_arm_root: Node3D
var feather_particles: GPUParticles3D
var dive_particles: GPUParticles3D
var melee_particles: GPUParticles3D
var burst_particles: GPUParticles3D
var area_pulse_particles: GPUParticles3D
var area_pulse_ring: MeshInstance3D
var area_pulse_ring_material: StandardMaterial3D
var area_pulse_effect_timer: float = 0.0
var area_pulse_effect_duration: float = 0.34
var area_pulse_effect_radius: float = 0.0
var visual_motion_time: float = 0.0
var run_pose_blend: float = 0.0
var collision_shape: CollisionShape3D

func configure(game_ref, config_ref) -> void:
	game = game_ref
	config = config_ref
	max_hp = config.player_max_hp
	hp = max_hp
	max_mp = config.player_max_mp
	mp = max_mp
	attack_damage = config.attack_damage
	attack_interval = config.attack_interval
	attack_range = config.attack_range
	projectile_speed = config.projectile_speed
	xp_to_next = _xp_requirement_for_level(level)

func _ready() -> void:
	_create_collision()
	_create_visuals()
	global_position.y = 0.85
	_refresh_collision_state()

func _physics_process(delta: float) -> void:
	if game == null or config == null or game.is_gameplay_paused():
		return
	_update_status_timers(delta)
	_update_form_resources(delta)
	_handle_transform_input()
	_apply_form_altitude(delta)
	if _update_bird_predation(delta):
		return
	_handle_movement(delta)
	_handle_human_melee_input(delta)
	_handle_burst_input()
	_handle_area_pulse(delta)
	_handle_auto_attack(delta)

func _create_collision() -> void:
	collision_layer = COLLISION_LAYER_PLAYER
	collision_mask = COLLISION_LAYER_WORLD | COLLISION_LAYER_ENEMY
	collision_shape = CollisionShape3D.new()
	var shape: CapsuleShape3D = CapsuleShape3D.new()
	shape.radius = 0.45
	shape.height = 1.6
	collision_shape.shape = shape
	add_child(collision_shape)

func _create_visuals() -> void:
	visual_root = Node3D.new()
	visual_root.name = "VisualRoot"
	add_child(visual_root)

	body_mesh = MeshInstance3D.new()
	body_mesh.name = "FallbackBody"
	var body: CapsuleMesh = CapsuleMesh.new()
	body.radius = 0.42
	body.height = 1.45
	body_mesh.mesh = body
	body_mesh.position.y = 0.05
	body_mesh.material_override = _make_material(Color(0.74, 0.82, 0.78), Color(0.0, 0.0, 0.0), 0.0)
	visual_root.add_child(body_mesh)

	var model_scene: PackedScene = load(PLAYER_MODEL_PATH) as PackedScene
	if model_scene != null:
		model_instance = model_scene.instantiate()
		model_instance.name = "TsuyukusaModel"
		model_instance.position = Vector3(0.0, 0.0, 0.0)
		model_instance.rotation = _get_model_pose_rotation(0.0, 0.0)
		if config != null:
			model_instance.scale = Vector3.ONE * config.player_model_scale
		visual_root.add_child(model_instance)
		body_mesh.visible = false
		_bind_model_skeleton()

	wing_mesh = MeshInstance3D.new()
	var wings: BoxMesh = BoxMesh.new()
	wings.size = Vector3(2.1, 0.08, 0.35)
	wing_mesh.mesh = wings
	wing_mesh.position.y = 0.55
	wing_mesh.visible = false
	wing_mesh.material_override = _make_material(Color(0.86, 0.92, 1.0), Color(0.18, 0.34, 0.55), 0.35)
	visual_root.add_child(wing_mesh)
	_create_run_arm_silhouette()
	_create_seed_orbits()

	feather_particles = GPUParticles3D.new()
	feather_particles.amount = 34
	feather_particles.lifetime = 0.8
	feather_particles.emitting = false
	var feather_mat: ParticleProcessMaterial = ParticleProcessMaterial.new()
	feather_mat.direction = Vector3(0.0, 1.0, 0.0)
	feather_mat.spread = 70.0
	feather_mat.gravity = Vector3(0.0, -2.0, 0.0)
	feather_mat.initial_velocity_min = 1.5
	feather_mat.initial_velocity_max = 4.0
	feather_mat.scale_min = 0.05
	feather_mat.scale_max = 0.14
	feather_mat.color = Color(0.78, 0.9, 1.0, 0.8)
	feather_particles.process_material = feather_mat
	add_child(feather_particles)

	dive_particles = GPUParticles3D.new()
	dive_particles.amount = 72
	dive_particles.lifetime = 0.35
	dive_particles.one_shot = true
	dive_particles.emitting = false
	var dive_mat: ParticleProcessMaterial = ParticleProcessMaterial.new()
	dive_mat.direction = Vector3(0.0, 1.0, 0.0)
	dive_mat.spread = 90.0
	dive_mat.gravity = Vector3(0.0, -6.0, 0.0)
	dive_mat.initial_velocity_min = 5.0
	dive_mat.initial_velocity_max = 11.0
	dive_mat.scale_min = 0.08
	dive_mat.scale_max = 0.2
	dive_mat.color = Color(0.85, 0.96, 1.0, 0.9)
	dive_particles.process_material = dive_mat
	add_child(dive_particles)

	melee_particles = GPUParticles3D.new()
	melee_particles.amount = 36
	melee_particles.lifetime = 0.18
	melee_particles.one_shot = true
	melee_particles.emitting = false
	var melee_mat: ParticleProcessMaterial = ParticleProcessMaterial.new()
	melee_mat.direction = Vector3(0.0, 0.35, -1.0)
	melee_mat.spread = 55.0
	melee_mat.initial_velocity_min = 4.0
	melee_mat.initial_velocity_max = 8.0
	melee_mat.scale_min = 0.04
	melee_mat.scale_max = 0.14
	melee_mat.color = Color(1.0, 0.92, 0.55, 0.85)
	melee_particles.process_material = melee_mat
	add_child(melee_particles)

	burst_particles = GPUParticles3D.new()
	burst_particles.amount = 160
	burst_particles.lifetime = 0.55
	burst_particles.one_shot = true
	burst_particles.emitting = false
	var burst_mat: ParticleProcessMaterial = ParticleProcessMaterial.new()
	burst_mat.direction = Vector3(0.0, 1.0, 0.0)
	burst_mat.spread = 180.0
	burst_mat.initial_velocity_min = 8.0
	burst_mat.initial_velocity_max = 18.0
	burst_mat.scale_min = 0.08
	burst_mat.scale_max = 0.28
	burst_mat.color = Color(0.8, 0.95, 1.0, 0.95)
	burst_particles.process_material = burst_mat
	add_child(burst_particles)

	area_pulse_particles = GPUParticles3D.new()
	area_pulse_particles.amount = 96
	area_pulse_particles.lifetime = 0.38
	area_pulse_particles.one_shot = true
	area_pulse_particles.emitting = false
	var pulse_mat: ParticleProcessMaterial = ParticleProcessMaterial.new()
	pulse_mat.direction = Vector3(0.0, 0.12, 1.0)
	pulse_mat.spread = 180.0
	pulse_mat.initial_velocity_min = 6.0
	pulse_mat.initial_velocity_max = 12.0
	pulse_mat.scale_min = 0.05
	pulse_mat.scale_max = 0.16
	pulse_mat.color = Color(0.42, 0.88, 1.0, 0.82)
	area_pulse_particles.process_material = pulse_mat
	add_child(area_pulse_particles)

	area_pulse_ring = MeshInstance3D.new()
	area_pulse_ring.name = "AreaPulseRing"
	var ring_mesh: CylinderMesh = CylinderMesh.new()
	ring_mesh.top_radius = 1.0
	ring_mesh.bottom_radius = 1.0
	ring_mesh.height = 0.035
	ring_mesh.radial_segments = 72
	area_pulse_ring.mesh = ring_mesh
	area_pulse_ring.visible = false
	area_pulse_ring_material = StandardMaterial3D.new()
	area_pulse_ring_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	area_pulse_ring_material.albedo_color = Color(0.28, 0.86, 1.0, 0.0)
	area_pulse_ring_material.emission_enabled = true
	area_pulse_ring_material.emission = Color(0.35, 0.95, 1.0)
	area_pulse_ring_material.emission_energy_multiplier = 1.7
	area_pulse_ring_material.cull_mode = BaseMaterial3D.CULL_DISABLED
	area_pulse_ring.material_override = area_pulse_ring_material
	add_child(area_pulse_ring)

func _create_run_arm_silhouette() -> void:
	run_arm_root = Node3D.new()
	run_arm_root.name = "RunArmSilhouette"
	run_arm_root.visible = false
	visual_root.add_child(run_arm_root)
	var material: StandardMaterial3D = _make_material(Color(0.12, 0.16, 0.18), Color(0.06, 0.12, 0.14), 0.15)
	for side in [-1.0, 1.0]:
		var arm: MeshInstance3D = MeshInstance3D.new()
		var mesh: CapsuleMesh = CapsuleMesh.new()
		mesh.radius = 0.055
		mesh.height = 0.72
		arm.mesh = mesh
		arm.position = Vector3(0.28 * side, 1.04, 0.34)
		arm.rotation = Vector3(deg_to_rad(76.0), 0.0, deg_to_rad(12.0 * side))
		arm.material_override = material
		run_arm_root.add_child(arm)

func _create_seed_orbits() -> void:
	seed_orbit_root = Node3D.new()
	seed_orbit_root.name = "SeedOrbitRoot"
	add_child(seed_orbit_root)
	seed_scene = load(SEED_MODEL_PATH) as PackedScene
	_sync_seed_orbs()

func _create_seed_orb_visual() -> Node3D:
	var root: Node3D = Node3D.new()
	root.name = "SeedOrb"
	var visual: Node3D
	if seed_scene != null:
		visual = seed_scene.instantiate() as Node3D
	else:
		var fallback: MeshInstance3D = MeshInstance3D.new()
		var sphere: SphereMesh = SphereMesh.new()
		sphere.radius = 0.5
		sphere.height = 1.0
		fallback.mesh = sphere
		fallback.material_override = _make_material(Color(0.55, 0.9, 0.45), Color(0.2, 0.8, 0.25), 0.7)
		visual = fallback
	visual.name = "SeedVisual"
	if config != null:
		visual.scale = Vector3.ONE * config.seed_visual_scale
	root.add_child(visual)
	return root

func _sync_seed_orbs() -> void:
	if seed_orbit_root == null or config == null:
		return
	var desired_count: int = clampi(projectile_count, 1, config.seed_orb_max_count)
	while seed_orbs.size() < desired_count:
		var orb: Node3D = _create_seed_orb_visual()
		seed_orbit_root.add_child(orb)
		seed_orbs.append(orb)
	while seed_orbs.size() > desired_count:
		var orb_to_remove: Node3D = seed_orbs.pop_back()
		if orb_to_remove != null:
			orb_to_remove.queue_free()

func _make_material(albedo: Color, emission: Color, emission_energy: float) -> StandardMaterial3D:
	var material: StandardMaterial3D = StandardMaterial3D.new()
	material.albedo_color = albedo
	if emission_energy > 0.0:
		material.emission_enabled = true
		material.emission = emission
		material.emission_energy_multiplier = emission_energy
	return material

func _update_form_resources(delta: float) -> void:
	if form == GameTypes.PlayerForm.HUMAN:
		mp = minf(max_mp, mp + (config.human_mp_regen + mp_regen_bonus) * delta)
	else:
		mp -= config.bird_mp_cost * bird_cost_multiplier * delta
		if mp <= 0.0:
			mp = 0.0
			set_form(GameTypes.PlayerForm.HUMAN)

func _update_status_timers(delta: float) -> void:
	egg_special_timer = maxf(0.0, egg_special_timer - delta)
	melee_cooldown_timer = maxf(0.0, melee_cooldown_timer - delta)
	melee_action_timer = maxf(0.0, melee_action_timer - delta)
	invulnerable_timer = maxf(0.0, invulnerable_timer - delta)
	phase_timer = maxf(0.0, phase_timer - delta)
	attack_lock_timer = maxf(0.0, attack_lock_timer - delta)
	_refresh_collision_state()
	_update_area_pulse_effect(delta)
	var blinking: bool = invulnerable_timer > 0.0 or phase_timer > 0.0
	var show_body: bool = true
	if blinking:
		show_body = int(Time.get_ticks_msec() / 90) % 2 == 0
	visual_root.visible = show_body
	body_mesh.visible = model_instance == null
	wing_mesh.visible = form == GameTypes.PlayerForm.BIRD
	_update_visual_motion(delta)
	_update_seed_orbs(delta)
	_update_arm_pose(delta)

func _handle_transform_input() -> void:
	var q_down: bool = Input.is_key_pressed(KEY_Q)
	if q_down and not q_was_down:
		if form == GameTypes.PlayerForm.HUMAN and mp > 4.0:
			set_form(GameTypes.PlayerForm.BIRD)
		elif form == GameTypes.PlayerForm.BIRD:
			set_form(GameTypes.PlayerForm.HUMAN)
	q_was_down = q_down

func _handle_movement(_delta: float) -> void:
	var input_vector: Vector2 = Vector2.ZERO
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP):
		input_vector.y -= 1.0
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN):
		input_vector.y += 1.0
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
		input_vector.x -= 1.0
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		input_vector.x += 1.0
	if input_vector.length_squared() > 1.0:
		input_vector = input_vector.normalized()
	var base_speed: float = config.human_speed if form == GameTypes.PlayerForm.HUMAN else config.bird_speed
	var move_speed: float = base_speed + extra_move_speed
	if melee_action_timer > 0.0:
		move_speed *= 0.45
	velocity = Vector3(input_vector.x, 0.0, input_vector.y) * move_speed
	move_and_slide()
	_apply_form_altitude(_delta)
	if game != null:
		var flat: Vector2 = Vector2(global_position.x, global_position.z)
		var radius: float = game.get_map_radius()
		if flat.length() > radius:
			flat = flat.normalized() * radius
			global_position.x = flat.x
			global_position.z = flat.y
	if velocity.length_squared() > 0.01:
		visual_root.look_at(global_position + velocity, Vector3.UP)

func _handle_human_melee_input(_delta: float) -> void:
	var melee_down: bool = Input.is_key_pressed(KEY_SPACE)
	if form == GameTypes.PlayerForm.HUMAN and melee_down and not melee_was_down:
		if melee_cooldown_timer <= 0.0 and attack_lock_timer <= 0.0:
			_perform_human_melee()
	melee_was_down = melee_down

func _perform_human_melee() -> void:
	melee_cooldown_timer = config.human_melee_cooldown
	melee_action_timer = config.human_melee_action_time
	attack_timer = maxf(attack_timer, config.human_melee_action_time)
	var forward: Vector3 = _get_forward_direction()
	var priority_egg = game.find_nearest_egg(global_position, config.human_egg_priority_range, true, false)
	if priority_egg != null:
		var to_egg: Vector3 = priority_egg.global_position - global_position
		to_egg.y = 0.0
		if to_egg.length_squared() > 0.01:
			forward = to_egg.normalized()
			visual_root.look_at(global_position + forward, Vector3.UP)
			_set_arm_aim_direction(forward, 0.28)
	melee_particles.rotation.y = atan2(forward.x, forward.z)
	melee_particles.restart()
	game.perform_human_melee(
		global_position,
		forward,
		config.human_melee_range,
		deg_to_rad(config.human_melee_arc_degrees),
		config.human_melee_enemy_damage,
		config.human_melee_egg_damage
	)

func _handle_burst_input() -> void:
	var burst_down: bool = Input.is_key_pressed(KEY_E)
	if form == GameTypes.PlayerForm.HUMAN and burst_down and not burst_was_down:
		if burst_gauge >= config.burst_max_gauge and attack_lock_timer <= 0.0:
			burst_gauge = 0.0
			invulnerable_timer = maxf(invulnerable_timer, config.burst_invulnerable_time)
			attack_lock_timer = maxf(attack_lock_timer, 0.35)
			burst_particles.restart()
			game.perform_burst_attack(global_position)
	burst_was_down = burst_down

func _handle_area_pulse(delta: float) -> void:
	if area_pulse_level <= 0 or form != GameTypes.PlayerForm.HUMAN:
		return
	area_pulse_timer -= delta
	if area_pulse_timer > 0.0:
		return
	area_pulse_timer = maxf(0.25, config.area_pulse_interval)
	var level_bonus: float = float(area_pulse_level - 1)
	var radius: float = config.area_pulse_radius + config.area_pulse_radius_per_level * level_bonus
	var damage: float = config.area_pulse_damage + config.area_pulse_damage_per_level * level_bonus
	if area_pulse_particles != null:
		area_pulse_particles.scale = Vector3.ONE * clampf(radius / maxf(config.area_pulse_radius, 0.1), 0.8, 2.4)
		area_pulse_particles.restart()
	_start_area_pulse_effect(radius)
	game.perform_area_pulse(global_position, radius, damage, config.area_pulse_egg_damage_multiplier)

func _start_area_pulse_effect(radius: float) -> void:
	if area_pulse_ring == null:
		return
	area_pulse_effect_radius = radius
	area_pulse_effect_timer = area_pulse_effect_duration
	area_pulse_ring.visible = true
	area_pulse_ring.global_position = Vector3(global_position.x, 0.05, global_position.z)
	area_pulse_ring.scale = Vector3.ONE * 0.25

func _update_area_pulse_effect(delta: float) -> void:
	if area_pulse_ring == null or area_pulse_ring_material == null:
		return
	if area_pulse_effect_timer <= 0.0:
		area_pulse_ring.visible = false
		return
	area_pulse_effect_timer = maxf(0.0, area_pulse_effect_timer - delta)
	var progress: float = 1.0 - area_pulse_effect_timer / maxf(area_pulse_effect_duration, 0.001)
	var radius_scale: float = lerpf(area_pulse_effect_radius * 0.25, area_pulse_effect_radius, progress)
	area_pulse_ring.global_position = Vector3(global_position.x, 0.05, global_position.z)
	area_pulse_ring.scale = Vector3(radius_scale, 1.0, radius_scale)
	var alpha: float = 0.42 * (1.0 - progress)
	area_pulse_ring_material.albedo_color = Color(0.28, 0.86, 1.0, alpha)
	if area_pulse_effect_timer <= 0.0:
		area_pulse_ring.visible = false

func _update_visual_motion(delta: float) -> void:
	if config == null:
		return
	visual_motion_time += delta
	var moving_on_ground: bool = form == GameTypes.PlayerForm.HUMAN and velocity.length_squared() > 0.25
	var target_blend: float = 1.0 if moving_on_ground else 0.0
	run_pose_blend = move_toward(run_pose_blend, target_blend, config.run_pose_lerp_speed * delta)
	if model_instance != null:
		var idle_weight: float = 1.0 - run_pose_blend
		var idle_bob: float = sin(visual_motion_time * config.idle_bob_speed) * config.idle_bob_height * idle_weight
		var run_bob: float = absf(sin(visual_motion_time * config.run_bob_speed)) * config.run_bob_height * run_pose_blend
		model_instance.position = Vector3(0.0, idle_bob + run_bob, 0.0)
		var pitch: float = lerpf(deg_to_rad(config.idle_pose_pitch_degrees), deg_to_rad(config.run_pose_lean_degrees), run_pose_blend)
		var roll: float = sin(visual_motion_time * config.idle_bob_speed * 0.55) * deg_to_rad(1.2) * idle_weight
		model_instance.rotation = _get_model_pose_rotation(pitch, roll)
	if run_arm_root != null:
		run_arm_root.visible = skeleton == null and form == GameTypes.PlayerForm.HUMAN and run_pose_blend > 0.12

func _update_seed_orbs(delta: float) -> void:
	if seed_orbit_root == null or config == null:
		return
	_sync_seed_orbs()
	seed_orbit_root.position = Vector3.ZERO
	var count: int = seed_orbs.size()
	if count <= 0:
		return
	var base_angle: float = visual_motion_time * config.seed_orbit_speed
	for i in range(count):
		var orb: Node3D = seed_orbs[i]
		if orb == null:
			continue
		var ratio: float = float(i) / float(count)
		var angle: float = base_angle + ratio * TAU
		var bob: float = sin(visual_motion_time * 2.2 + ratio * TAU) * config.seed_orbit_bob_height
		orb.position = Vector3(
			cos(angle) * config.seed_orbit_radius,
			config.seed_orbit_height + bob,
			sin(angle) * config.seed_orbit_radius
		)
		orb.rotation.y += delta * 1.7
		orb.rotation.x = sin(visual_motion_time * 1.6 + ratio * TAU) * 0.15

func _update_bird_predation(delta: float) -> bool:
	if form != GameTypes.PlayerForm.BIRD:
		_clear_predation_target()
		return false
	if predation_target != null:
		if not is_instance_valid(predation_target) or not predation_target.active:
			_clear_predation_target()
			return false
		var mother_dive: bool = predation_target.is_mother
		predation_timer -= delta
		var to_target: Vector3 = predation_target.global_position - global_position
		to_target.y = 0.0
		if predation_timer > 0.0:
			var stop_distance: float = 1.45 if mother_dive else 1.05
			if to_target.length() > stop_distance:
				var step: float = config.bird_speed * 0.65 * delta
				var approach_position: Vector3 = Vector3(predation_target.global_position.x, global_position.y, predation_target.global_position.z)
				global_position = global_position.move_toward(approach_position, step)
				_apply_form_altitude(delta)
			dive_particles.emitting = true
			return true
		dive_particles.restart()
		if mother_dive:
			predation_target.take_damage(config.mother_bird_dive_damage * dive_damage_multiplier)
		else:
			predation_target.take_damage(config.bird_predation_damage * dive_damage_multiplier)
			mp = minf(max_mp, mp + max_mp * config.bird_predation_mp_restore_ratio)
		_clear_predation_target()
		return true
	var target = game.find_predation_egg(global_position, config.bird_predation_detect_range, self)
	if target == null:
		target = game.find_mother_dive_target(global_position, config.mother_bird_dive_detect_range)
	if target != null:
		predation_target = target
		predation_timer = config.mother_bird_dive_wait_time if predation_target.is_mother else config.bird_predation_wait_time
		if not predation_target.is_mother:
			predation_target.set_predation_claim(self)
		dive_particles.restart()
		return true
	return false

func _clear_predation_target() -> void:
	if predation_target != null and is_instance_valid(predation_target):
		predation_target.clear_predation_claim(self)
	predation_target = null
	predation_timer = 0.0

func _get_seed_fire_origin(index: int) -> Vector3:
	if seed_orbs.is_empty():
		return global_position + Vector3(0.0, 0.8, 0.0)
	var orb: Node3D = seed_orbs[index % seed_orbs.size()]
	if orb == null or not is_instance_valid(orb):
		return global_position + Vector3(0.0, 0.8, 0.0)
	return orb.global_position

func _fire_seed_projectiles(target: Vector3, damage: float, speed: float, count: int, pierce: int) -> void:
	if game == null or config == null:
		return
	_sync_seed_orbs()
	var shot_count: int = clampi(count, 1, max(1, config.seed_orb_max_count))
	for i in range(shot_count):
		var origin: Vector3 = _get_seed_fire_origin(seed_fire_index + i)
		game.fire_player_projectiles(origin, target, damage, speed, 1, pierce)
	seed_fire_index = (seed_fire_index + shot_count) % max(1, seed_orbs.size())

func _handle_auto_attack(delta: float) -> void:
	if form != GameTypes.PlayerForm.HUMAN:
		return
	if attack_lock_timer > 0.0 or melee_action_timer > 0.0:
		return
	if game == null:
		return
	if egg_special_timer <= 0.0:
		var egg_target: Egg = game.find_nearest_egg(global_position, config.egg_special_shot_range, true, false) as Egg
		if egg_target != null:
			egg_special_timer = maxf(0.08, config.egg_special_shot_interval)
			_fire_seed_projectiles(
				egg_target.global_position + Vector3(0.0, 0.45, 0.0),
				config.egg_special_shot_damage,
				projectile_speed,
				projectile_count,
				0
			)
			return
	attack_timer -= delta
	if attack_timer > 0.0:
		return
	var target = game.find_human_auto_target(global_position, attack_range, config.human_egg_priority_range)
	if target == null:
		return
	attack_timer = maxf(0.08, attack_interval)
	_fire_seed_projectiles(
		target.global_position + Vector3(0.0, 0.45, 0.0),
		attack_damage,
		projectile_speed,
		projectile_count,
		projectile_pierce
	)

func set_form(next_form: int) -> void:
	if form == next_form:
		return
	var previous_form: int = form
	if previous_form == GameTypes.PlayerForm.BIRD:
		_clear_predation_target()
	form = next_form
	_refresh_collision_state()
	var bird: bool = form == GameTypes.PlayerForm.BIRD
	wing_mesh.visible = bird
	feather_particles.emitting = bird
	visual_root.scale = Vector3(0.72, 0.72, 0.72) if bird else Vector3.ONE
	body_mesh.material_override = _make_material(
		Color(0.77, 0.9, 1.0) if bird else Color(0.74, 0.82, 0.78),
		Color(0.16, 0.35, 0.55) if bird else Color.BLACK,
		0.35 if bird else 0.0
	)
	if previous_form == GameTypes.PlayerForm.BIRD and form == GameTypes.PlayerForm.HUMAN:
		invulnerable_timer = maxf(invulnerable_timer, config.form_release_invulnerable_time)
		phase_timer = maxf(phase_timer, config.form_release_phase_time)
		attack_lock_timer = maxf(attack_lock_timer, config.form_release_attack_lock_time)
	if game != null:
		game.on_player_form_changed(form)

func take_damage(amount: float) -> void:
	if game == null or game.is_result_finished():
		return
	if invulnerable_timer > 0.0:
		return
	hp = maxf(0.0, hp - amount)
	if hp <= 0.0:
		game.lose_game("HP が尽きました")

func heal_to_new_max(ratio: float) -> void:
	hp = minf(max_hp, hp + max_hp * ratio)

func can_receive_contact_damage() -> bool:
	return form == GameTypes.PlayerForm.HUMAN and phase_timer <= 0.0 and invulnerable_timer <= 0.0

func can_be_hit_by_enemy_projectile(projectile_position: Vector3, hit_radius: float) -> bool:
	if form == GameTypes.PlayerForm.BIRD:
		var flat_delta: Vector2 = Vector2(global_position.x - projectile_position.x, global_position.z - projectile_position.z)
		return flat_delta.length_squared() <= config.bird_projectile_hit_radius * config.bird_projectile_hit_radius
	return global_position.distance_squared_to(projectile_position) <= hit_radius * hit_radius

func get_invulnerable_time_left() -> float:
	return maxf(invulnerable_timer, phase_timer)

func _apply_form_altitude(delta: float) -> void:
	var target_height: float = config.bird_flight_height if form == GameTypes.PlayerForm.BIRD else config.human_ground_height
	global_position.y = move_toward(global_position.y, target_height, config.form_altitude_lerp_speed * delta)

func _refresh_collision_state() -> void:
	var avoid_enemy_collision: bool = form == GameTypes.PlayerForm.BIRD or phase_timer > 0.0
	if avoid_enemy_collision:
		collision_layer = COLLISION_LAYER_AIR_PLAYER
		collision_mask = COLLISION_LAYER_WORLD
	else:
		collision_layer = COLLISION_LAYER_PLAYER
		collision_mask = COLLISION_LAYER_WORLD | COLLISION_LAYER_ENEMY

func get_predation_wait_ratio() -> float:
	if form != GameTypes.PlayerForm.BIRD or predation_target == null:
		return 0.0
	var wait_time: float = config.mother_bird_dive_wait_time if predation_target.is_mother else config.bird_predation_wait_time
	return clampf(predation_timer / maxf(wait_time, 0.01), 0.0, 1.0)

func is_diving_mother() -> bool:
	return form == GameTypes.PlayerForm.BIRD and predation_target != null and is_instance_valid(predation_target) and predation_target.is_mother

func add_burst(amount: float) -> void:
	burst_gauge = minf(config.burst_max_gauge, burst_gauge + amount)

func is_burst_ready() -> bool:
	return burst_gauge >= config.burst_max_gauge

func _get_forward_direction() -> Vector3:
	var forward: Vector3 = -visual_root.global_transform.basis.z
	forward.y = 0.0
	if forward.length_squared() <= 0.01:
		return Vector3(0.0, 0.0, -1.0)
	return forward.normalized()

func _get_model_pose_rotation(pitch: float, roll: float) -> Vector3:
	var yaw: float = deg_to_rad(90.0)
	if config != null:
		yaw = deg_to_rad(config.player_model_yaw_degrees)
	return Vector3(pitch, yaw, roll)

func _bind_model_skeleton() -> void:
	if model_instance == null:
		return
	var skeletons: Array = model_instance.find_children("*", "Skeleton3D", true, false)
	if skeletons.is_empty():
		return
	skeleton = skeletons[0] as Skeleton3D
	if skeleton == null:
		return
	right_upper_arm_bone = _find_first_bone(["upper_arm.R", "UpperArm.R", "mixamorig:RightArm", "RightArm", "RightUpperArm"])
	right_forearm_bone = _find_first_bone(["forearm.R", "Forearm.R", "mixamorig:RightForeArm", "RightForeArm", "RightLowerArm"])
	right_hand_bone = _find_first_bone(["hand.R", "Hand.R", "mixamorig:RightHand", "RightHand"])
	left_upper_arm_bone = _find_first_bone(["upper_arm.L", "UpperArm.L", "mixamorig:LeftArm", "LeftArm", "LeftUpperArm"])
	left_forearm_bone = _find_first_bone(["forearm.L", "Forearm.L", "mixamorig:LeftForeArm", "LeftForeArm", "LeftLowerArm"])
	left_hand_bone = _find_first_bone(["hand.L", "Hand.L", "mixamorig:LeftHand", "LeftHand"])

func _find_first_bone(candidates: Array) -> int:
	if skeleton == null:
		return -1
	for candidate in candidates:
		var index: int = skeleton.find_bone(str(candidate))
		if index >= 0:
			return index
	return -1

func _set_arm_aim_direction(direction: Vector3, duration: float) -> void:
	direction.y = 0.0
	if direction.length_squared() <= 0.01:
		return
	arm_aim_direction = direction.normalized()
	arm_aim_timer = maxf(arm_aim_timer, duration)

func _update_arm_pose(delta: float) -> void:
	if skeleton == null:
		return
	arm_aim_timer = maxf(0.0, arm_aim_timer - delta)
	if arm_aim_timer > 0.0:
		_apply_arm_aim_pose()
	elif form == GameTypes.PlayerForm.HUMAN and run_pose_blend > 0.25:
		_apply_run_arm_pose()
	else:
		_apply_idle_arm_pose()

func _apply_arm_aim_pose() -> void:
	if skeleton == null:
		return
	var local_dir: Vector3 = visual_root.global_transform.basis.inverse() * arm_aim_direction
	local_dir.y = 0.0
	if local_dir.length_squared() <= 0.01:
		return
	local_dir = local_dir.normalized()
	var yaw: float = atan2(local_dir.x, -local_dir.z)
	var upper_pose: Quaternion = Quaternion(Vector3.FORWARD, -0.85) * Quaternion(Vector3.UP, yaw * 0.55)
	var forearm_pose: Quaternion = Quaternion(Vector3.FORWARD, -0.35) * Quaternion(Vector3.UP, yaw * 0.35)
	var hand_pose: Quaternion = Quaternion(Vector3.UP, yaw * 0.25)
	if right_upper_arm_bone >= 0:
		skeleton.set_bone_pose_rotation(right_upper_arm_bone, upper_pose)
	if right_forearm_bone >= 0:
		skeleton.set_bone_pose_rotation(right_forearm_bone, forearm_pose)
	if right_hand_bone >= 0:
		skeleton.set_bone_pose_rotation(right_hand_bone, hand_pose)

func _apply_run_arm_pose() -> void:
	if skeleton == null:
		return
	var shoulder_back: Quaternion = Quaternion(Vector3.RIGHT, deg_to_rad(-62.0)) * Quaternion(Vector3.FORWARD, deg_to_rad(-18.0))
	var shoulder_back_left: Quaternion = Quaternion(Vector3.RIGHT, deg_to_rad(-62.0)) * Quaternion(Vector3.FORWARD, deg_to_rad(18.0))
	var forearm_back: Quaternion = Quaternion(Vector3.RIGHT, deg_to_rad(-18.0))
	_set_bone_pose(right_upper_arm_bone, shoulder_back)
	_set_bone_pose(right_forearm_bone, forearm_back)
	_set_bone_pose(right_hand_bone, Quaternion.IDENTITY)
	_set_bone_pose(left_upper_arm_bone, shoulder_back_left)
	_set_bone_pose(left_forearm_bone, forearm_back)
	_set_bone_pose(left_hand_bone, Quaternion.IDENTITY)

func _apply_idle_arm_pose() -> void:
	if skeleton == null:
		return
	var relaxed_right: Quaternion = Quaternion(Vector3.FORWARD, deg_to_rad(-8.0))
	var relaxed_left: Quaternion = Quaternion(Vector3.FORWARD, deg_to_rad(8.0))
	_set_bone_pose(right_upper_arm_bone, relaxed_right)
	_set_bone_pose(right_forearm_bone, Quaternion.IDENTITY)
	_set_bone_pose(right_hand_bone, Quaternion.IDENTITY)
	_set_bone_pose(left_upper_arm_bone, relaxed_left)
	_set_bone_pose(left_forearm_bone, Quaternion.IDENTITY)
	_set_bone_pose(left_hand_bone, Quaternion.IDENTITY)

func _set_bone_pose(bone_index: int, pose: Quaternion) -> void:
	if skeleton != null and bone_index >= 0:
		skeleton.set_bone_pose_rotation(bone_index, pose)

func gain_xp(amount: int) -> void:
	xp += amount
	while xp >= xp_to_next:
		xp -= xp_to_next
		level += 1
		pending_level_ups += 1
		xp_to_next = _xp_requirement_for_level(level)
	if pending_level_ups > 0 and game != null:
		game.request_level_up()

func make_upgrade_choices(rng: RandomNumberGenerator) -> Array[Dictionary]:
	var pool: Array[Dictionary] = [
		{"id": GameTypes.UpgradeId.AREA_PULSE, "name": "範囲パルス", "description": "人間形態で周囲へ自動範囲攻撃。重ねると範囲と威力が上昇"},
		{"id": GameTypes.UpgradeId.DAMAGE, "name": "攻撃力", "description": "弾のダメージ +25%"},
		{"id": GameTypes.UpgradeId.ATTACK_SPEED, "name": "攻撃速度", "description": "攻撃間隔 -12%"},
		{"id": GameTypes.UpgradeId.PROJECTILE_COUNT, "name": "弾数", "description": "同時発射数 +1"},
		{"id": GameTypes.UpgradeId.PIERCE, "name": "貫通数", "description": "弾の貫通 +1"},
		{"id": GameTypes.UpgradeId.MOVE_SPEED, "name": "移動速度", "description": "人間と鳥の移動速度 +0.8"},
		{"id": GameTypes.UpgradeId.MAX_HP, "name": "最大HP", "description": "最大HP +20、少し回復"},
		{"id": GameTypes.UpgradeId.MAX_MP, "name": "最大MP", "description": "最大MP +20、MP回復"},
		{"id": GameTypes.UpgradeId.MP_REGEN, "name": "MP回復", "description": "人間形態のMP回復 +2/秒"},
		{"id": GameTypes.UpgradeId.BIRD_EFFICIENCY, "name": "鳥形態効率", "description": "鳥形態のMP消費 -12%"},
		{"id": GameTypes.UpgradeId.DIVE_DAMAGE, "name": "急降下強化", "description": "急降下攻撃ダメージ +35%"}
	]
	var choices: Array[Dictionary] = []
	while choices.size() < 3 and not pool.is_empty():
		var index: int = rng.randi_range(0, pool.size() - 1)
		choices.append(pool[index])
		pool.remove_at(index)
	return choices

func apply_upgrade(upgrade_id: int) -> void:
	match upgrade_id:
		GameTypes.UpgradeId.DAMAGE:
			attack_damage *= 1.25
		GameTypes.UpgradeId.ATTACK_SPEED:
			attack_interval *= 0.88
		GameTypes.UpgradeId.PROJECTILE_COUNT:
			projectile_count += 1
			_sync_seed_orbs()
		GameTypes.UpgradeId.PIERCE:
			projectile_pierce += 1
		GameTypes.UpgradeId.MOVE_SPEED:
			extra_move_speed += 0.8
		GameTypes.UpgradeId.MAX_HP:
			max_hp += 20.0
			heal_to_new_max(0.35)
		GameTypes.UpgradeId.MAX_MP:
			max_mp += 20.0
			mp = minf(max_mp, mp + 30.0)
		GameTypes.UpgradeId.MP_REGEN:
			mp_regen_bonus += 2.0
		GameTypes.UpgradeId.BIRD_EFFICIENCY:
			bird_cost_multiplier = maxf(0.45, bird_cost_multiplier * 0.88)
		GameTypes.UpgradeId.DIVE_DAMAGE:
			dive_damage_multiplier *= 1.35
		GameTypes.UpgradeId.AREA_PULSE:
			area_pulse_level += 1
			area_pulse_timer = minf(area_pulse_timer, 0.2)
	pending_level_ups = max(0, pending_level_ups - 1)
	if pending_level_ups > 0 and game != null:
		game.call_deferred("request_level_up")

func _xp_requirement_for_level(next_level: int) -> int:
	if config == null:
		return 14
	return int(round(float(config.xp_base_requirement) * pow(config.xp_requirement_growth, float(next_level - 1))))
