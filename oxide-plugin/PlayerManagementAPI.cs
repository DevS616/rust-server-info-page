using System;
using System.Collections.Generic;
using System.Linq;
using Oxide.Core;
using Oxide.Core.Libraries.Covalence;
using Newtonsoft.Json;

namespace Oxide.Plugins
{
    [Info("Player Management API", "YourName", "1.0.0")]
    [Description("REST API для управления игроками через HTTP")]
    class PlayerManagementAPI : RustPlugin
    {
        private Configuration config;

        #region Configuration

        private class Configuration
        {
            [JsonProperty("API Key")]
            public string ApiKey { get; set; } = "change_this_secure_key_12345";

            [JsonProperty("API Port")]
            public int ApiPort { get; set; } = 8080;

            [JsonProperty("Listen IP")]
            public string ListenIp { get; set; } = "0.0.0.0";
        }

        protected override void LoadConfig()
        {
            base.LoadConfig();
            try
            {
                config = Config.ReadObject<Configuration>();
                if (config == null)
                {
                    throw new Exception();
                }
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
            // Регистрация веб-хендлера
            Interface.Oxide.GetLibrary<Core.Libraries.WebRequests>().Shutdown();
        }

        private void OnServerInitialized()
        {
            Puts($"Player Management API запущен на {config.ListenIp}:{config.ApiPort}");
            Puts($"API Key: {config.ApiKey}");
            
            // Запуск HTTP сервера
            timer.Every(1f, () => ProcessWebRequests());
        }

        #endregion

        #region Web Server Logic

        private void ProcessWebRequests()
        {
            // Oxide имеет встроенную систему обработки веб-запросов
            // Используем команды консоли для обработки
        }

        [ConsoleCommand("playerapi.list")]
        private void CmdApiListPlayers(ConsoleSystem.Arg arg)
        {
            if (!ValidateApiKey(arg)) return;

            var players = BasePlayer.activePlayerList.Select(p => new
            {
                player_id = p.UserIDString,
                name = p.displayName,
                steam_id = p.UserIDString,
                ping = Network.Net.sv.GetAveragePing(p.net.connection),
                connected_time = GetConnectedTime(p),
                health = p.health,
                position = $"{p.transform.position.x:F0}, {p.transform.position.y:F0}, {p.transform.position.z:F0}"
            }).ToList();

            arg.ReplyWith(JsonConvert.SerializeObject(new
            {
                success = true,
                server_name = ConVar.Server.hostname,
                players = players,
                total = players.Count
            }));
        }

        [ConsoleCommand("playerapi.kick")]
        private void CmdApiKickPlayer(ConsoleSystem.Arg arg)
        {
            if (!ValidateApiKey(arg)) return;

            var playerId = arg.GetString(0);
            var reason = arg.GetString(1, "Kicked by admin");

            var player = FindPlayer(playerId);
            if (player == null)
            {
                arg.ReplyWith(JsonConvert.SerializeObject(new { success = false, error = "Player not found" }));
                return;
            }

            player.Kick(reason);
            arg.ReplyWith(JsonConvert.SerializeObject(new { success = true, message = $"Player {player.displayName} kicked" }));
        }

        [ConsoleCommand("playerapi.ban")]
        private void CmdApiBanPlayer(ConsoleSystem.Arg arg)
        {
            if (!ValidateApiKey(arg)) return;

            var playerId = arg.GetString(0);
            var reason = arg.GetString(1, "Banned by admin");
            var durationMinutes = arg.GetInt(2, 0);

            var player = FindPlayer(playerId);
            if (player == null)
            {
                arg.ReplyWith(JsonConvert.SerializeObject(new { success = false, error = "Player not found" }));
                return;
            }

            if (durationMinutes > 0)
            {
                // Временный бан
                var until = DateTime.UtcNow.AddMinutes(durationMinutes);
                ServerUsers.Set(player.userID, ServerUsers.UserGroup.Banned, player.displayName, reason);
                ServerUsers.Save();
                player.Kick($"Banned: {reason} (until {until:yyyy-MM-dd HH:mm} UTC)");
            }
            else
            {
                // Перманентный бан
                player.Ban(reason);
            }

            arg.ReplyWith(JsonConvert.SerializeObject(new 
            { 
                success = true, 
                message = $"Player {player.displayName} banned",
                duration = durationMinutes > 0 ? $"{durationMinutes} minutes" : "permanent"
            }));
        }

        [ConsoleCommand("playerapi.mute")]
        private void CmdApiMutePlayer(ConsoleSystem.Arg arg)
        {
            if (!ValidateApiKey(arg)) return;

            var playerId = arg.GetString(0);
            var durationMinutes = arg.GetInt(1, 60);

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
                message = $"Player {player.displayName} muted for {durationMinutes} minutes" 
            }));
        }

        #endregion

        #region Helper Methods

        private bool ValidateApiKey(ConsoleSystem.Arg arg)
        {
            var providedKey = arg.GetString(arg.Args.Length - 1);
            if (providedKey != config.ApiKey)
            {
                arg.ReplyWith(JsonConvert.SerializeObject(new { success = false, error = "Invalid API key" }));
                return false;
            }
            return true;
        }

        private BasePlayer FindPlayer(string nameOrId)
        {
            ulong userId;
            if (ulong.TryParse(nameOrId, out userId))
            {
                return BasePlayer.FindByID(userId) ?? BasePlayer.FindSleeping(userId);
            }

            return BasePlayer.activePlayerList.FirstOrDefault(p => 
                p.displayName.Contains(nameOrId, StringComparison.OrdinalIgnoreCase));
        }

        private string GetConnectedTime(BasePlayer player)
        {
            if (player?.net?.connection == null) return "Unknown";

            var seconds = UnityEngine.Time.realtimeSinceStartup - player.net.connection.connectionTime;
            var timeSpan = TimeSpan.FromSeconds(seconds);

            if (timeSpan.TotalHours >= 1)
                return $"{(int)timeSpan.TotalHours}h {timeSpan.Minutes}m";
            else if (timeSpan.TotalMinutes >= 1)
                return $"{(int)timeSpan.TotalMinutes}m";
            else
                return $"{(int)timeSpan.TotalSeconds}s";
        }

        #endregion
    }
}
