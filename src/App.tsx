import { AppProvider, useApp } from './app/state';
import { SheetView, TabBar, ToastView } from './components/Chrome';
import { AddFlow } from './screens/AddFlow';
import { Entry } from './screens/Entry';
import { Deleted, Expenses } from './screens/Expenses';
import { Media } from './screens/Media';
import { ReturnFlow } from './screens/ReturnFlow';
import { Room, Summary } from './screens/Summary';
import { Tasks } from './screens/Tasks';
import { Who } from './screens/Who';
import { Workers } from './screens/Workers';

function Shell() {
  const { ui, loading, loadError, reload, needCode } = useApp();
  const s = needCode ? 'who' : ui.screen;
  const flow = s === 'add' || s === 'return';
  const showTabs = s !== 'who' && !flow;
  const hasBar = s === 'tasks' || s === 'list';

  let content;
  if (loading && s !== 'who') content = <div className="spinner-page">Loading…</div>;
  else if (loadError && s !== 'who') {
    content = (
      <div className="spinner-page stack g12 center" style={{ padding: '1rem' }}>
        <p className="t17">Couldn't load the family's data. Check your internet.</p>
        <button type="button" className="btn btn-primary" onClick={reload}>Try again</button>
      </div>
    );
  } else {
    switch (s) {
      case 'who': content = <Who />; break;
      case 'tasks': content = <Tasks />; break;
      case 'add': content = <AddFlow />; break;
      case 'return': content = <ReturnFlow />; break;
      case 'list': content = <Expenses />; break;
      case 'entry': content = <Entry />; break;
      case 'bin': content = <Deleted />; break;
      case 'insights': content = <Summary />; break;
      case 'room': content = <Room />; break;
      case 'media': content = <Media />; break;
      case 'workers': content = <Workers />; break;
    }
  }

  const toastBottom = showTabs ? (hasBar ? '10.25rem' : '6rem') : flow ? '6.5rem' : '1.5rem';
  return (
    <div className="app">
      {content}
      {showTabs && <TabBar />}
      <ToastView bottom={toastBottom} />
      <SheetView />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
