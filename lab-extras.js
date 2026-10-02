/* lab-extras.js — adds Run buttons, concurrency timelines and spot-the-bug cards
   to the Async & Ecosystem Rust Lab. Include with: <script src="lab-extras.js" defer></script> */
(() => {
  const css = `
  .lx-bar{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin:-.4rem 0 1rem}
  .lx-btn{background:rgba(164,145,211,.12);color:var(--accent);border:1px solid rgba(164,145,211,.3);border-radius:6px;padding:.3rem .75rem;font:inherit;font-size:.85rem;cursor:pointer}
  .lx-btn:hover{background:rgba(164,145,211,.22)}
  .lx-btn.run{color:var(--highlight);border-color:rgba(197,220,160,.4);background:rgba(197,220,160,.08)}
  .lx-hint{color:var(--text-muted);font-size:.8rem}
  .lx-out{background:var(--code-bg);border:1px solid var(--border);border-left:3px solid var(--highlight);border-radius:6px;padding:.75rem 1rem;margin:0 0 1rem;white-space:pre-wrap;font:.88rem ui-monospace,Menlo,Consolas,monospace;color:var(--text)}
  .lx-out.err{border-left-color:#e07a7a;color:#f0b4b4}
  pre code[contenteditable]{outline:none;display:block}
  pre:focus-within{border-color:var(--accent)}
  .lx-box{border:1px dashed var(--border);border-radius:8px;padding:1rem 1.25rem;margin:1.25rem 0}
  .lx-box h3{margin-top:0}
  .lx-head{color:var(--text-muted);font-size:.8rem;margin:.9rem 0 .3rem;font-family:ui-monospace,Menlo,Consolas,monospace}
  .lx-row{display:flex;align-items:center;gap:.6rem;margin:.3rem 0;font-size:.82rem;color:var(--text-muted)}
  .lx-row>span{width:5.5rem;flex:none}
  .lx-track{position:relative;flex:1;height:26px;background:rgba(255,255,255,.03);border-radius:4px}
  .lx-seg{position:absolute;top:0;height:100%;border-radius:4px;overflow:hidden;border:1px dashed var(--border);box-sizing:border-box}
  .lx-seg i{display:block;height:100%;width:0;transition-property:width;transition-timing-function:linear}
  .go .lx-seg i{width:100%}
  .nt .lx-seg i{transition:none!important}
  .lx-seg b{position:absolute;inset:0;display:flex;align-items:center;padding-left:.4rem;font-weight:600;font-size:.72rem;color:#141619;white-space:nowrap;overflow:hidden}
  .c-ok i{background:var(--highlight)} .c-ac i{background:var(--accent)} .c-bad i{background:#e07a7a}
  .c-wait{border-style:dashed} .c-wait i{background:repeating-linear-gradient(45deg,#3a4152,#3a4152 4px,#2a303c 4px,#2a303c 8px)}
  .c-wait b{color:var(--text)}
  .lx-note{margin:.6rem 0 0;font-size:.88rem;color:var(--highlight-2)}
  .lx-ctl{display:flex;align-items:center;gap:.6rem;margin:.5rem 0;font-size:.85rem;color:var(--text-muted)}
  .lx-ans{margin-top:.75rem}
  .lx-ans .fix{color:var(--highlight)}`;
  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: css }));

  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const btn = (txt, cls) => el('button', 'lx-btn' + (cls ? ' ' + cls : ''), txt);

  /* ---------- 1. Copy / Run / Open in Playground ---------- */
  document.querySelectorAll('.concept-card').forEach(sec => {
    const pre = sec.querySelector('pre'); if (!pre) return;
    const code = pre.querySelector('code');
    const original = code.innerHTML;
    const canRun = !sec.id.startsWith('reqwest');
    const bar = el('div', 'lx-bar');
    const out = el('pre', 'lx-out'); out.hidden = true;

    const copy = btn('Copy');
    copy.onclick = async () => {
      try { await navigator.clipboard.writeText(code.innerText); copy.textContent = 'Copied ✓'; }
      catch { copy.textContent = 'Press Ctrl/Cmd+C'; }
      setTimeout(() => (copy.textContent = 'Copy'), 1500);
    };
    bar.append(copy);

    if (canRun) {
      code.contentEditable = 'true'; code.spellcheck = false;
      const run = btn('▶ Run', 'run'), open = btn('Open in Playground'), reset = btn('Reset');
      run.onclick = async () => {
        out.hidden = false; out.className = 'lx-out'; out.textContent = 'Compiling and running…';
        try {
          const r = await fetch('https://play.rust-lang.org/execute', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel: 'stable', mode: 'debug', edition: '2021', crateType: 'bin', tests: false, backtrace: false, code: code.innerText })
          });
          const j = await r.json();
          out.textContent = (j.success ? j.stdout : (j.stderr || j.error)) || '(no output)';
          if (!j.success) out.classList.add('err');
        } catch (e) { out.classList.add('err'); out.textContent = 'Could not reach the Rust Playground: ' + e.message; }
      };
      open.onclick = () => window.open('https://play.rust-lang.org/?version=stable&mode=debug&edition=2021&code=' + encodeURIComponent(code.innerText), '_blank');
      reset.onclick = () => { code.innerHTML = original; out.hidden = true; };
      bar.append(run, open, reset, el('span', 'lx-hint', 'Code is editable — tweak it and run again.'));
    } else {
      bar.append(el('span', 'lx-hint', 'Needs network access, which the Playground blocks. Run it locally with cargo run.'));
    }
    pre.after(bar, out);
  });

  /* ---------- 3. Timeline visualizations ---------- */
  const K = 10; // 1 "ms" of the diagram = 10 real ms
  function timeline(title, get, ctl) {
    const box = el('div', 'lx-box'); box.append(el('h3', null, '⏱ ' + title));
    const play = btn('▶ Play', 'run');
    const ctlWrap = el('div', 'lx-ctl'); ctlWrap.append(play);
    const host = el('div'); const note = el('p', 'lx-note');
    box.append(ctlWrap, host, note);
    const total = 300;
    function render() {
      const { rows, text } = get();
      host.innerHTML = '';
      rows.forEach(r => {
        if (r.head) { host.append(el('div', 'lx-head', r.head)); return; }
        const row = el('div', 'lx-row'), track = el('div', 'lx-track');
        row.append(el('span', null, r.label), track);
        r.segs.forEach(s => {
          const seg = el('div', 'lx-seg c-' + s.c); seg.style.left = (s.s / total * 100) + '%'; seg.style.width = (s.d / total * 100) + '%';
          const i = el('i'); i.style.transitionDuration = s.d * K + 'ms'; i.style.transitionDelay = s.s * K + 'ms';
          seg.append(i, el('b', null, s.t || '')); track.append(seg);
        });
        host.append(row);
      });
      note.textContent = text;
    }
    play.onclick = () => {
      host.classList.add('nt'); host.classList.remove('go'); void host.offsetWidth;
      host.classList.remove('nt'); host.classList.add('go');
    };
    if (ctl) ctlWrap.append(...ctl(render));
    render();
    return box;
  }

  const viz = {
    'concept-3': () => {
      let ms = 100;
      const sleepBox = timeline('thread::sleep vs tokio::time::sleep (one worker thread)', () => ({
        rows: [
          { head: 'std::thread::sleep — blocks the worker' },
          { label: 'Task A', segs: [{ s: 0, d: 200, c: 'bad', t: 'blocked' }] },
          { label: 'Task B', segs: [{ s: 0, d: 200, c: 'wait', t: 'stuck waiting' }, { s: 200, d: 100, c: 'ok', t: 'runs' }] },
          { head: 'tokio::time::sleep — yields the worker' },
          { label: 'Task A', segs: [{ s: 0, d: 200, c: 'wait', t: 'parked (free)' }] },
          { label: 'Task B', segs: [{ s: 0, d: 100, c: 'ok', t: 'runs now' }] }
        ],
        text: 'Blocking: B finishes at 300ms. Async: B finishes at 100ms while A is still sleeping.'
      }));
      const toBox = timeline('timeout(100ms, slow_operation()) — drag the limit', () => {
        const hit = ms < 200;
        return {
          rows: [
            { label: 'Operation', segs: hit ? [{ s: 0, d: ms, c: 'ok', t: 'working' }, { s: ms, d: 200 - ms, c: 'wait', t: 'dropped' }] : [{ s: 0, d: 200, c: 'ok', t: 'done' }] },
            { label: 'Timer', segs: [{ s: 0, d: Math.min(ms, 200), c: 'ac', t: ms + 'ms limit' }] }
          ],
          text: hit ? `Timer wins at ${ms}ms → Err(Elapsed). The future is dropped, so the rest of the work never runs.` : 'Operation wins at 200ms → Ok("Success").'
        };
      }, render => {
        const r = Object.assign(el('input'), { type: 'range', min: 50, max: 300, step: 10, value: 100 });
        const lab = el('span', null, '100ms');
        r.oninput = () => { ms = +r.value; lab.textContent = ms + 'ms'; render(); };
        return [r, lab];
      });
      return [sleepBox, toBox];
    },
    'concept-5': () => [timeline('Sequential .await vs tokio::join!', () => ({
      rows: [
        { head: 'fetch_user().await; fetch_score().await;' },
        { label: 'fetch_user', segs: [{ s: 0, d: 100, c: 'ok', t: '100ms' }] },
        { label: 'fetch_score', segs: [{ s: 100, d: 200, c: 'ac', t: '200ms' }] },
        { head: 'tokio::join!(fetch_user(), fetch_score())' },
        { label: 'fetch_user', segs: [{ s: 0, d: 100, c: 'ok', t: '100ms' }] },
        { label: 'fetch_score', segs: [{ s: 0, d: 200, c: 'ac', t: '200ms' }] }
      ],
      text: 'Sequential takes the sum (300ms). join! takes the slowest one (200ms).'
    }))]
  };
  Object.entries(viz).forEach(([id, make]) => {
    const pre = document.querySelector('#' + id + ' pre');
    const anchor = document.querySelector('#' + id + ' .lx-out') || pre;
    if (anchor) anchor.after(...make());
  });

  /* ---------- 4. Spot-the-bug cards ---------- */
  const bugs = {
    'concept-2': {
      t: 'borrowing in a spawned task',
      bad: `#[tokio::main]
async fn main() {
    let name = String::from("Alice");
    let handle = tokio::spawn(async {
        println!("Hello, {name}");
    });
    handle.await.unwrap();
}`,
      why: 'Compile error: the task may outlive main, but the async block only borrows `name`. Spawned tasks need \'static data, so they must own what they use.',
      fix: `let handle = tokio::spawn(async move {
    println!("Hello, {name}");
});`
    },
    'concept-3': {
      t: 'a blocking sleep inside async code',
      bad: `use std::time::Duration;

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let a = tokio::spawn(async {
        std::thread::sleep(Duration::from_secs(2));
        println!("A done");
    });
    let b = tokio::spawn(async { println!("B done"); });
    let _ = tokio::join!(a, b);
}`,
      why: 'It compiles, but B is stuck until A is done. std::thread::sleep freezes the whole worker thread, so no other task can be polled. In a real server this shows up as mysterious latency spikes.',
      fix: `let a = tokio::spawn(async {
    tokio::time::sleep(Duration::from_secs(2)).await;
    println!("A done");
});`
    },
    'concept-4': {
      t: 'a receiver loop that never ends',
      bad: `use tokio::sync::mpsc;

#[tokio::main]
async fn main() {
    let (tx, mut rx) = mpsc::channel(32);

    let tx_clone = tx.clone();
    tokio::spawn(async move {
        tx_clone.send("hello").await.unwrap();
    });

    while let Some(msg) = rx.recv().await {
        println!("Received: {msg}");
    }
}`,
      why: 'It prints "hello" and then hangs forever. recv() only returns None once every sender is dropped, and the original `tx` is still alive in main.',
      fix: `drop(tx); // add this before the while-let loop`
    },
    'reqwest-2': {
      t: 'assuming a 404 is an error',
      bad: `#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let res = reqwest::get("https://httpbin.org/status/404").await?;
    println!("Success! Body: {}", res.text().await?);
    Ok(())
}`,
      why: 'The ? only catches network-level failures. A 404 or 500 still comes back as Ok(Response), so this prints "Success!" for a failed request.',
      fix: `let res = reqwest::get("https://httpbin.org/status/404")
    .await?
    .error_for_status()?; // turns 4xx/5xx into Err`
    },
    'serde-3': {
      t: 'a missing field',
      bad: `use serde::Deserialize;

#[derive(Deserialize, Debug)]
struct Settings {
    theme: String,
}

fn main() {
    let s: Settings = serde_json::from_str("{}").unwrap();
    println!("{s:?}");
}`,
      why: 'It panics with: missing field `theme`. A plain String is required, so absent keys are a parse error.',
      fix: `theme: Option<String>,   // missing -> None
// or
#[serde(default)]
theme: String,           // missing -> ""`
    }
  };
  Object.entries(bugs).forEach(([id, b]) => {
    const sec = document.getElementById(id); if (!sec) return;
    const card = el('div', 'lx-box lx-bug'); card.append(el('h3', null, ' Spot the bug: ' + b.t));
    const pre = el('pre'); pre.append(el('code', null, b.bad));
    const reveal = btn('What goes wrong?'), ans = el('div', 'lx-ans'); ans.hidden = true;
    const fixPre = el('pre'); fixPre.append(el('code', 'fix', b.fix));
    ans.append(el('p', null, b.why), el('h3', null, 'Fix'), fixPre);
    reveal.onclick = () => { ans.hidden = !ans.hidden; reveal.textContent = ans.hidden ? 'What goes wrong?' : 'Hide answer'; };
    card.append(pre, reveal, ans);
    const boxes = sec.querySelectorAll('.lx-box');
    (boxes.length ? boxes[boxes.length - 1] : sec.querySelector('.lx-out') || sec.querySelector('pre')).after(card);
  });
})();