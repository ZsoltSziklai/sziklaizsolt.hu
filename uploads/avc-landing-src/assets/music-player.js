(function () {
  var tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
})();

var ytPlayer, isMuted = false, isPlaying = false;

window.onYouTubeIframeAPIReady = function () {
  ytPlayer = new YT.Player('yt-player', {
    videoId: 'iVSUVmxDcls',
    playerVars: {
      autoplay: 0, controls: 0, loop: 1,
      playlist: 'iVSUVmxDcls', rel: 0, iv_load_policy: 3, modestbranding: 1
    },
    events: {
      onReady: function (e) { e.target.setVolume(30); },
      onStateChange: function (e) {
        isPlaying = e.data === YT.PlayerState.PLAYING;
        setPlayIcon(isPlaying);
      }
    }
  });
};

function setPlayIcon(playing) {
  document.getElementById('music-play').innerHTML = playing
    ? '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="4" height="12" rx="1"/><rect x="9" y="2" width="4" height="12" rx="1"/></svg>'
    : '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 2l10 6-10 6z"/></svg>';
}

function setMuteIcon(muted) {
  document.getElementById('icon-vol').innerHTML = muted
    ? '<path d="M2 5.5h2.5l3.5-3v11l-3.5-3H2z" fill="currentColor" stroke="none"/><line x1="11" y1="5" x2="15" y2="9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><line x1="15" y1="5" x2="11" y2="9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
    : '<path d="M2 5.5h2.5l3.5-3v11l-3.5-3H2z" fill="currentColor" stroke="none"/><path d="M10.5 5.5a3.5 3.5 0 0 1 0 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="M12.5 3.5a6 6 0 0 1 0 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/>';
}

document.getElementById('music-play').addEventListener('click', function () {
  if (!ytPlayer || !ytPlayer.getPlayerState) return;
  ytPlayer.getPlayerState() === YT.PlayerState.PLAYING
    ? ytPlayer.pauseVideo()
    : ytPlayer.playVideo();
});

document.getElementById('music-mute').addEventListener('click', function () {
  if (!ytPlayer) return;
  isMuted = !isMuted;
  isMuted ? ytPlayer.mute() : ytPlayer.unMute();
  setMuteIcon(isMuted);
});

document.getElementById('music-vol').addEventListener('input', function () {
  if (!ytPlayer) return;
  var v = parseInt(this.value);
  ytPlayer.setVolume(v);
  if (v === 0 && !isMuted) { isMuted = true; ytPlayer.mute(); setMuteIcon(true); }
  else if (v > 0 && isMuted) { isMuted = false; ytPlayer.unMute(); setMuteIcon(false); }
});
