import React, { useState, useEffect, useMemo, useRef } from "react";
import "./Remote.css";
import throttle from "lodash.throttle";
import { invoke } from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";
import {
  Add,
  Pause,
  Power,
  Refresh,
  Remove,
  Next,
  Play,
  Previous,
  Tungsten,
  TungstenModified,
  Volume
} from "./icons";

const THROTTLE_MS = 500; //no dos plz

const Remote = () => {
  const [deviceState, setDeviceState] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const skipVolUpdate = useRef(true);

  useEffect(() => {
    listen("window-visible", refreshState);
    refreshState();


    fetch("http://192.168.1.109/YamahaExtendedControl/v1/main/getStatus", {
      method: 'GET',
      headers: {
        accept: "application/json"
      }
    }).then(resp => console.log(resp))

  }, []);

  const refreshState = () => {
    setRefreshing(true);
    skipVolUpdate.current = true;
    const main = invoke("send_request", { url: "main/getStatus" });
    const func = invoke("send_request", { url: "system/getFuncStatus" });
    Promise.all([main, func]).then(resps => {
      let [mainResp, funcResp] = resps;
      const { power, volume, mute, input } = JSON.parse(mainResp);
      const { dimmer } = JSON.parse(funcResp);
      setDeviceState({ power, volume, mute, input, dimmer });
      setRefreshing(false);
      skipVolUpdate.current = false;
    });
  };

  useEffect(() => {
    if (skipVolUpdate.current) return;

    throttledVolUpdate(deviceState.volume);
  }, [deviceState.volume]);

  const _updateVol = vol => {
    invoke("send_request", { url: `main/setVolume?volume=${vol}` });
  };

  const throttledVolUpdate = useMemo(() => throttle(_updateVol, THROTTLE_MS), []);

  const volBtnHelper = vol => () => updateVolume(vol);

  const updateVolume = vol => setDeviceState({ ...deviceState, volume: vol.clamp(41, 141) });

  const handleMouseWheel = event => {
    const change = event.nativeEvent.deltaY > 0 ? -1 : 1;
    updateVolume(deviceState.volume + change);
  }

  const changeInput = input => {
    let volume = input === "qobuz" ? 91 : 141;
    setDeviceState({ ...deviceState, input, volume });
    invoke("send_request", { url: `main/setInput?input=${input}` });
  };

  const toggleMute = () => {
    invoke("send_request", { url: `main/setMute?enable=${!deviceState.mute}` });
    setDeviceState({ ...deviceState, mute: !deviceState.mute });
  };

  const togglePower = () => {
    const power = deviceState.power === "on" ? "standby" : "on";
    invoke("send_request", { url: `main/setPower?power=${power}` });
    setDeviceState({ ...deviceState, power });
  };

  const audioSkipPrev = () => invoke("send_request", { url: "netusb/setPlayback?playback=previous" });

  const audioPause = () => invoke("send_request", { url: "netusb/setPlayback?playback=play_pause" });

  const audioSkipNext = () => invoke("send_request", { url: "netusb/setPlayback?playback=next" });

  const dim = deviceState.dimmer === 0;

  const toggleDimmer = () => {
    const dimmerValue = dim ? 3 : 0;
    invoke("send_request", { url: `system/setDimmer?value=${dimmerValue}` });
    setDeviceState({ ...deviceState, dimmer: dimmerValue });
  };

  const currentVolumeText = parseInt(deviceState.volume).map(41, 141, -60, -10) * -1;


  return (
    <div className="main" onWheel={handleMouseWheel}>
      <div className="topBtns">
        <button className={`btn-teal ${dim ? "" : "btn-active"}`} onClick={toggleDimmer}>
          <img src={dim ? TungstenModified : Tungsten} className="rotate" />
        </button>
        <button className={`btn-yellow`} onClick={refreshState}>
          <img src={Refresh} className={refreshing ? "rotating" : ""} />
        </button>
        <button
          className={`btn-body-gray ${
            deviceState.power === "on" ? "power-on btn-active" : "btn-red"
          }`}
          onClick={togglePower}
        >
          <img src={Power} className="filter-white" />
        </button>
        <button
          className={`btn-green ${deviceState.input === "qobuz" ? "btn-active" : ""}`}
          onClick={() => changeInput("qobuz")}
        >
          NET
        </button>
        <button
          className={`btn-purple ${deviceState.input === "optical" ? "btn-active" : ""}`}
          onClick={() => changeInput("optical")}
        >
          OPT
        </button>
        <button
          className={`btn-white ${deviceState.input === "aux" ? "btn-active" : ""}`}
          onClick={() => changeInput("aux")}
        >
          AUX
        </button>
      </div>

      <div className="container">
        <div className="container-btns container-dark">
          <button className="btn-body-gray" onClick={volBtnHelper(deviceState.volume - 1)}>
            <img src={Remove} className="filter-white" />
          </button>
          <button className="btn-body-gray" onClick={volBtnHelper(deviceState.volume + 1)}>
            <img src={Add} className="filter-white" />
          </button>

          <button
            className={`btn-body-gray ${deviceState.mute ? "btn-red" : ""}`}
            onClick={() => toggleMute()}
          >
            <img src={Volume} className="filter-white" />
          </button>
        </div>
      </div>

      <div className="vol-container">{`-${currentVolumeText.toFixed(1)} dB`}</div>

      <div className="container">
        <div className="container-btns">
          <button onClick={volBtnHelper(41)} className="vol-btn">
            -60
          </button>
          <button onClick={volBtnHelper(91)} className="vol-btn">
            -35
          </button>
          <button onClick={volBtnHelper(141)} className="vol-btn">
            -10
          </button>

          <input
            type="range"
            id="range"
            max={141}
            min={41}
            step={2}
            value={deviceState.volume}
            onChange={e => updateVolume(parseInt(e.target.value))}
          />
        </div>
      </div>

      <div className="container" style={{ marginBottom: "15px" }}>
        <div className="container-btns noborder">
          <button
            className="btn-body-gray"
            disabled={deviceState.input !== "qobuz"}
            onClick={audioSkipPrev}
          >
            <img src={Previous} className="filter-white" />
          </button>
          <button
            className="btn-body-gray"
            disabled={deviceState.input !== "qobuz"}
            onClick={audioPause}
          >
            <img src={Play} className="filter-white" style={{ marginRight: "-4px" }} />
            <img src={Pause} className="filter-white" style={{ marginLeft: "-4px" }} />
          </button>
          <button
            className="btn-body-gray"
            disabled={deviceState.input !== "qobuz"}
            onClick={audioSkipNext}
          >
            <img src={Next} className="filter-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Remote;
