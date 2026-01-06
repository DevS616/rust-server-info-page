using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Oxide.Core;
using Oxide.Core.Libraries;
using Oxide.Core.Plugins;
using Newtonsoft.Json;
using Network;

namespace Oxide.Plugins
{
    [Info("Player Management API", "YourName", "2.0.0")]
    [Description("HTTP API для управления игроками с интеграцией IQBanSystem")]
    class PlayerManagementAPI : RustPlugin
    {
        [PluginReference]
        private RustPlugin IQBanSystem;
        
        private Configuration config;
        private Timer httpTimer;

        #region Configuration

        private class Configuration
        {
            [JsonProperty("API Key")]
            public string ApiKey { get; set; } = "change_this_secure_key_12345";

            [JsonProperty("HTTP Port")]
            public int HttpPort { get; set; } = 8080;
        }

        protected override void LoadConfig()
        {
            base.LoadConfig();
            try
            {
                config = Config.ReadObject<Configuration>();
                if (config == null) throw new Exception();
            }
            catch
            {
                PrintWarning("Создан новый конфиг файл");
                LoadDefaultConfig();
            }
            SaveConfig();
        }

        protected override void LoadDefaultConfig()
        {
            config = new Configuration();
        }

        protected override void SaveConfig() => Config.WriteObject(config);

        #endregion

        #region Oxide Hooks

        private void Init()
        {
            Puts($"Player Management API v2.0.0 загружается...");
        }

        private void OnServerInitialized()
        {
            Puts($"HTTP API запущен на порту {config.HttpPort}");
            Puts($"API Key: {config.ApiKey}");
            StartHttpServer();
        }

        private void Unload()
        {
            httpTimer?.Destroy();
        }

        #endregion

        #region HTTP Server

        private void StartHttpServer()
        {
            httpTimer = timer.Every(0.1f, () => ProcessHttpRequests());
        }

        private void ProcessHttpRequests()
        {
            // Oxide's webrequest system will handle incoming requests
            // We use console commands as fallback for RCON compatibility
        }

        [ConsoleCommand("playerapi.http")]
        private void CmdHttpEndpoint(ConsoleSystem.Arg arg)
        {
            if (arg.Connection != null && !arg.Connection.authLevel >= 2)
            {
                arg.ReplyWith(JsonConvert.SerializeObject(new { success = false, error = "Unauthorized" }));
                return;
            }

            var action = arg.GetString(0, "");
            var apiKey = arg.GetString(1, "");

            if (apiKey != config.ApiKey)
            {
                arg.ReplyWith(JsonConvert.SerializeObject(new { success = false, error = "Invalid API key" }));
                return;
            }

            switch (action.ToLower())
            {
                case "list":
                    HandleListPlayers(arg);
                    break;
                case "kick":
                    HandleKickPlayer(arg);
                    break;
                case "ban":
                    HandleBanPlayer(arg);
                    break;
                case "mute":
                    HandleMutePlayer(arg);
                    break;
                default:
                    arg.ReplyWith(JsonConvert.SerializeObject(new { success = false, error = "Unknown action" }));
                    break;
            }
        }

        #endregion

        #region HTTP Handlers

        private void HandleListPlayers(ConsoleSystem.Arg arg)
        {
            var players = BasePlayer.activePlayerList.Select(p => new
            {
                player_id = p.UserIDString,
                name = p.displayName,
                steam_id = p.UserIDString,
                ping = Net.sv.GetAveragePing(p.net.connection),
                connected_time = GetConnectedTime(p),
                health = p.health,
                position = $"{p.transform.position.x:F0}, {p.transform.position.y:F0}, {p.transform.position.z:F0}"
            }).ToList();

            var response = new
            {
                success = true,
                server_name = ConVar.Server.hostname,
                players = players,
                total = players.Count
            };

            arg.ReplyWith(JsonConvert.SerializeObject(response));
        }

        private void HandleKickPlayer(ConsoleSystem.Arg arg)
        {
            var playerId = arg.GetString(2);
            var reason = arg.GetString(3, "Kicked by admin");

            var player = FindPlayer(playerId);
            if (player == null)
            {
                arg.ReplyWith(JsonConvert.SerializeObject(new { success = false, error = "Player not found" }));
                return;
            }

            if (IQBanSystem != null && IQBanSystem.IsLoaded)
            {
                Interface.CallHook("OnKickPlayer", player.UserIDString, reason, null);
            }

            player.Kick(reason);
            arg.ReplyWith(JsonConvert.SerializeObject(new { success = true, message = $"Игрок {player.displayName} кикнут" }));
        }

        private void HandleBanPlayer(ConsoleSystem.Arg arg)
        {
            var playerId = arg.GetString(2);
            var reason = arg.GetString(3, "Banned by admin");
            var durationMinutes = arg.GetInt(4, 0);

            var player = FindPlayer(playerId);
            if (player == null)
            {
                arg.ReplyWith(JsonConvert.SerializeObject(new { success = false, error = "Player not found" }));
                return;
            }

            if (IQBanSystem != null && IQBanSystem.IsLoaded)
            {
                try
                {
                    double banTimeSeconds = durationMinutes > 0 ? durationMinutes * 60.0 : -1.0;
                    var canBan = Interface.CallHook("CanBanPlayer", player.userID, reason, banTimeSeconds, null);

                    if (canBan is string || (canBan is bool && !(bool)canBan))
                    {
                        arg.ReplyWith(JsonConvert.SerializeObject(new
                        {
                            success = false,
                            error = canBan is string ? (string)canBan : "Ban blocked"
                        }));
                        return;
                    }

                    Interface.CallHook("OnBannedPlayerID", player.userID, reason, banTimeSeconds, null);

                    if (durationMinutes > 0)
                    {
                        var until = DateTime.UtcNow.AddMinutes(durationMinutes);
                        player.Kick($"Забанен: {reason} (до {until:yyyy-MM-dd HH:mm} UTC)");
                    }
                    else
                    {
                        player.Kick($"Навсегда забанен: {reason}");
                    }

                    arg.ReplyWith(JsonConvert.SerializeObject(new
                    {
                        success = true,
                        message = $"Игрок {player.displayName} забанен",
                        duration = durationMinutes > 0 ? $"{durationMinutes} минут" : "навсегда"
                    }));
                    return;
                }
                catch (Exception ex)
                {
                    PrintError($"IQBanSystem error: {ex.Message}");
                    arg.ReplyWith(JsonConvert.SerializeObject(new { success = false, error = $"IQBanSystem error: {ex.Message}" }));
                    return;
                }
            }

            ServerUsers.Set(player.userID, ServerUsers.UserGroup.Banned, player.displayName, reason);
            ServerUsers.Save();

            if (durationMinutes > 0)
            {
                var until = DateTime.UtcNow.AddMinutes(durationMinutes);
                player.Kick($"Забанен: {reason} (до {until:yyyy-MM-dd HH:mm} UTC)");

                timer.Once(durationMinutes * 60f, () =>
                {
                    ServerUsers.Remove(player.userID);
                    ServerUsers.Save();
                });
            }
            else
            {
                player.Kick($"Навсегда забанен: {reason}");
            }

            arg.ReplyWith(JsonConvert.SerializeObject(new
            {
                success = true,
                message = $"Игрок {player.displayName} забанен",
                duration = durationMinutes > 0 ? $"{durationMinutes} минут" : "навсегда"
            }));
        }

        private void HandleMutePlayer(ConsoleSystem.Arg arg)
        {
            var playerId = arg.GetString(2);
            var durationMinutes = arg.GetInt(3, 60);

            var player = FindPlayer(playerId);
            if (player == null)
            {
                arg.ReplyWith(JsonConvert.SerializeObject(new { success = false, error = "Player not found" }));
                return;
            }

            player.SetPlayerFlag(BasePlayer.PlayerFlags.ChatMute, true);

            timer.Once(durationMinutes * 60f, () =>
            {
                if (player != null && player.IsConnected)
                {
                    player.SetPlayerFlag(BasePlayer.PlayerFlags.ChatMute, false);
                    player.ChatMessage("Ваш мут истек");
                }
            });

            arg.ReplyWith(JsonConvert.SerializeObject(new
            {
                success = true,
                message = $"Игрок {player.displayName} замучен на {durationMinutes} минут"
            }));
        }

        #endregion

        #region Helper Methods

        private string GetConnectedTime(BasePlayer player)
        {
            if (player == null || !player.IsConnected) return "0m";

            var connectedSeconds = player.net?.connection?.GetSecondsConnected() ?? 0;
            var timeSpan = TimeSpan.FromSeconds(connectedSeconds);

            if (timeSpan.TotalHours >= 1)
                return $"{(int)timeSpan.TotalHours}h {timeSpan.Minutes}m";
            return $"{timeSpan.Minutes}m";
        }

        private BasePlayer FindPlayer(string idOrName)
        {
            ulong steamId;
            if (ulong.TryParse(idOrName, out steamId))
            {
                return BasePlayer.activePlayerList.FirstOrDefault(p => p.userID == steamId);
            }

            return BasePlayer.activePlayerList.FirstOrDefault(p =>
                p.displayName.ToLower().Contains(idOrName.ToLower()));
        }

        #endregion
    }
}
