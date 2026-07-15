extends Resource
class_name GameConfig

@export_group("Map")
@export var map_radius: float = 58.0
@export var initial_egg_count: int = 4
@export var max_eggs: int = 120
@export var max_enemies: int = 250
@export var game_duration: float = 480.0
@export var mother_egg_time: float = 420.0

@export_group("Player")
@export var player_max_hp: float = 100.0
@export var player_max_mp: float = 100.0
@export var human_ground_height: float = 0.85
@export var bird_flight_height: float = 10.0
@export var form_altitude_lerp_speed: float = 16.0
@export var bird_projectile_hit_radius: float = 1.25
@export var human_speed: float = 6.0
@export var bird_speed: float = 12.0
@export var human_mp_regen: float = 6.0
@export var bird_mp_cost: float = 14.0
@export var contact_damage_interval: float = 0.55
@export var form_release_invulnerable_time: float = 1.2
@export var form_release_phase_time: float = 1.2
@export var form_release_attack_lock_time: float = 0.25

@export_group("Player Visual")
@export var player_model_scale: float = 1.65
@export var player_model_yaw_degrees: float = 90.0
@export var idle_bob_height: float = 0.025
@export var idle_bob_speed: float = 2.0
@export var idle_pose_pitch_degrees: float = -2.0
@export var run_pose_lean_degrees: float = -15.0
@export var run_pose_lerp_speed: float = 8.0
@export var run_bob_height: float = 0.04
@export var run_bob_speed: float = 8.0
@export var seed_orbit_radius: float = 0.95
@export var seed_orbit_height: float = 1.45
@export var seed_orbit_bob_height: float = 0.12
@export var seed_orbit_speed: float = 1.4
@export var seed_visual_scale: float = 0.32
@export var seed_orb_max_count: int = 12

@export_group("Human Attack")
@export var attack_interval: float = 0.75
@export var attack_damage: float = 10.0
@export var attack_range: float = 12.0
@export var projectile_speed: float = 18.0
@export var projectile_lifetime: float = 1.4
@export var human_melee_cooldown: float = 0.55
@export var human_melee_action_time: float = 0.18
@export var human_melee_range: float = 3.2
@export var human_melee_arc_degrees: float = 105.0
@export var human_melee_enemy_damage: float = 22.0
@export var human_melee_egg_damage: float = 34.0
@export var human_egg_priority_range: float = 4.0
@export var egg_special_shot_range: float = 5.0
@export var egg_special_shot_interval: float = 0.45
@export var egg_special_shot_damage: float = 1.05

@export_group("Bird Dive")
@export var dive_damage: float = 24.0
@export var dive_egg_damage_multiplier: float = 3.0
@export var dive_radius: float = 4.2
@export var dive_cooldown: float = 1.0
@export var bird_predation_detect_range: float = 4.0
@export var bird_predation_wait_time: float = 0.45
@export var bird_predation_lunge_time: float = 0.18
@export var bird_predation_damage: float = 999.0
@export var bird_predation_mp_restore_ratio: float = 0.10
@export var mother_bird_dive_detect_range: float = 5.0
@export var mother_bird_dive_wait_time: float = 0.35
@export var mother_bird_dive_damage: float = 72.0

@export_group("Eggs")
@export var egg_max_hp: float = 42.0
@export var egg_mature_time: float = 8.0
@export var egg_hatch_min: float = 12.0
@export var egg_hatch_max: float = 18.0
@export var egg_hatch_late_speed_multiplier: float = 1.65
@export var egg_spread_interval: float = 18.0
@export var egg_spread_min_distance: float = 4.0
@export var egg_spread_max_distance: float = 10.0
@export var egg_xp_value: int = 8
@export var egg_destroy_hp_restore_ratio: float = 0.05
@export var egg_resurgence_delay: float = 0.0
@export var egg_resurgence_min_player_distance: float = 24.0

@export_group("Mother Egg")
@export var mother_egg_hp: float = 260.0
@export var mother_guardians: int = 8

@export_group("Enemies")
@export var chaser_hp: float = 24.0
@export var chaser_speed: float = 3.2
@export var chaser_damage: float = 8.0
@export var shooter_hp: float = 30.0
@export var shooter_speed: float = 2.35
@export var shooter_damage: float = 7.0
@export var shooter_range: float = 15.0
@export var shooter_keep_distance: float = 9.0
@export var shooter_cooldown: float = 2.1
@export var guardian_hp: float = 72.0
@export var guardian_speed: float = 2.55
@export var guardian_damage: float = 13.0
@export var guardian_leash_radius: float = 15.0
@export var spawner_hp: float = 42.0
@export var spawner_speed: float = 13.8
@export var spawner_damage: float = 4.0
@export var spawner_lifetime: float = 60.0
@export var spawner_hatch_chance_low_eggs: float = 0.28
@export var spawner_hatch_chance_high_eggs: float = 0.02
@export var spawner_flee_radius: float = 9.0
@export var spawner_destination_repick_time: float = 6.0
@export var spawner_destination_arrive_radius: float = 2.4
@export var spawner_lay_min_interval: float = 6.0
@export var spawner_lay_max_interval: float = 10.0
@export var spawner_lay_nearby_radius: float = 8.0
@export var spawner_lay_nearby_limit: int = 3
@export var spawner_lay_min_egg_distance: float = 5.0
@export var spawner_destination_candidates: int = 9
@export var spawner_destination_density_radius: float = 14.0
@export var spawner_destination_spread_radius: float = 12.0
@export var separation_radius: float = 1.7
@export var separation_strength: float = 2.6
@export var grid_cell_size: float = 5.0

@export_group("Experience")
@export var xp_base_requirement: int = 14
@export var xp_requirement_growth: float = 1.26
@export var orb_pickup_radius: float = 1.45
@export var orb_magnet_radius: float = 8.0
@export var orb_speed: float = 11.0

@export_group("Area Pulse")
@export var area_pulse_interval: float = 1.15
@export var area_pulse_radius: float = 5.2
@export var area_pulse_radius_per_level: float = 0.75
@export var area_pulse_damage: float = 14.0
@export var area_pulse_damage_per_level: float = 6.0
@export var area_pulse_egg_damage_multiplier: float = 0.55

@export_group("Burst")
@export var burst_max_gauge: float = 100.0
@export var burst_gain_enemy: float = 5.0
@export var burst_gain_egg: float = 12.0
@export var burst_gain_spawner: float = 20.0
@export var burst_radius: float = 12.0
@export var burst_enemy_damage: float = 100.0
@export var burst_egg_damage: float = 50.0
@export var burst_mother_egg_damage_cap: float = 35.0
@export var burst_knockback_force: float = 9.0
@export var burst_invulnerable_time: float = 1.0
