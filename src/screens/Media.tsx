import { useState } from 'react';
import { useApp } from '../app/state';
import { Image, Receipt } from '../components/Icons';
import { NestedHeader, PhotoUpload, Segmented } from '../components/ui';
import { live, nameOf } from '../lib/derive';
import { money, short, today, uid } from '../lib/format';
import { photoUrl } from '../lib/photos';
import type { Photo } from '../lib/types';

interface Tile {
  key: string;
  date: string;
  kind: 'Receipt' | 'Site photo';
  title: string;
  sub: string;
  url: string | null;
  aria: string;
  open: () => void;
}

export function Media() {
  const { data, me, put, flash, nav, back, setSheet } = useApp();
  const [filter, setFilter] = useState<'all' | 'receipts' | 'photos'>('all');
  const active = live(data.expenses);

  const receipts: Tile[] = active.flatMap((e) => e.receipts.map((rc) => ({
    key: rc.id, date: e.date, kind: 'Receipt' as const, title: `${nameOf(e)}, ${money(e.amount)}`, sub: `${short(e.date)}, ${e.room}`,
    url: photoUrl(rc), aria: `Receipt for ${nameOf(e)}. Opens the expense`,
    open: () => nav({ screen: 'entry', entryId: e.id, entryBack: 'media' })
  })));
  const openPhoto = (p: Photo) => setSheet({
    title: p.room || 'Site photo', body: `Added by ${p.by} on ${short(p.date)}.`, closeLabel: 'Close',
    photo: { name: p.name, url: photoUrl(p) }
  });
  const photos: Tile[] = data.photos.map((p) => ({
    key: p.id, date: p.date, kind: 'Site photo' as const, title: p.room || 'Site photo', sub: `${short(p.date)}, by ${p.by}`,
    url: photoUrl(p), aria: `Site photo, ${p.room ?? ''}, ${short(p.date)}. Opens the photo`, open: () => openPhoto(p)
  }));
  const tiles = (filter === 'receipts' ? receipts : filter === 'photos' ? photos : [...receipts, ...photos]).sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <>
      <NestedHeader title="Photos and receipts" backLabel="Summary" onBack={back} />
      <main className="main">
        <div className="stack g16">
          <p className="t16 muted pretty">All photos are kept in the family photo folder. Tap a receipt to see its expense.</p>
          <Segmented label="Show" value={filter} options={[['all', 'All'], ['receipts', 'Receipts'], ['photos', 'Site photos']]} onChange={setFilter} />
          <PhotoUpload folder="site" onSaved={(ref) => {
            put('photos', [{ id: uid(), name: ref.name, room: null, date: today(), by: me, provider: ref.provider, fileId: ref.fileId }]);
            setFilter('all');
            flash('Photo saved');
          }} />
          {tiles.length ? (
            <div className="grid2" style={{ gap: '0.75rem' }}>
              {tiles.map((t) => (
                <button key={t.key} type="button" className="tile" aria-label={t.aria} onClick={t.open}>
                  <span className={`thumb${t.kind === 'Receipt' ? ' receipt' : ''}`}>
                    {t.url ? <img src={t.url} alt="" loading="lazy" /> : <>{t.kind === 'Receipt' ? <Receipt size={28} /> : <Image size={28} />}<span className="t13 b7">{t.kind}</span></>}
                  </span>
                  <span className="t16 b7" style={{ padding: '0 0.25rem', lineHeight: 1.3 }}>{t.title}</span>
                  <span className="t14 muted" style={{ padding: '0 0.25rem' }}>{t.sub}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty">No photos yet. Tap Add photo to save one.</div>
          )}
        </div>
      </main>
    </>
  );
}
