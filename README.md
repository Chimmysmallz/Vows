# Vows.ng

Free wedding websites built for Nigerian weddings — multi-ceremony RSVP,
invitation codes, seating, aso-ebi, gifts by bank transfer, and gate check-in.

## What is in this repo

| Path | What it is |
| --- | --- |
| `public/index.html` | The landing page. Static, self-contained, collects waitlist signups. Deploy this first. |
| `design/prototype.html` | The full product prototype — every screen, working, on sample data. This is the design spec. Do not delete it. |
| `design/art/` | The twelve source illustrations (garden, hall, beach, cathedral, rooftop, destination, plus wedding details). |
| `firestore.rules` | Security rules. The most important file in the project. |
| `storage.rules` | Receipt and photo bucket rules. |
| `firebase.json` | Hosting + emulator config. |

## The rule that matters

A wedding page is public — anyone with the link reads it. Firestore rules are the
only thing between a guest and the couple's vendor payments, gift amounts, and the
phone number of every person they know.

**Never put private data in a publicly readable document.** The wedding document is
public; guests, gifts, vendors, aso-ebi and roles are private subcollections.
Client-side hiding is decoration.

## Data model

```
weddings/{slug}                     public   couple names, date, colours, venue style,
                                             ceremonies, story, gift account details
weddings/{slug}/guests/{id}         private  name, code, phone, seats, table, responses
weddings/{slug}/rsvps/{code}        create   write-only drop box; a function merges it
weddings/{slug}/gifts/{id}          owner    giver, amount, receipt path, acknowledged
weddings/{slug}/registry/{id}       public   item, target, received (function-written)
weddings/{slug}/vendors/{id}        owner+   quote, paid, due, status
weddings/{slug}/asoebi/{id}         helpers  colour, size, paid, collected
weddings/{slug}/photos/{id}         public   approved uploads only
weddings/{slug}/roles/{uid}         owner    role name, enabled flag
signups/{id}                        create   waitlist; write-only
```

Two decisions worth remembering:

- **The RSVP drop box.** A guest must write an RSVP without signing in but must
  never read the guest list, and Firestore cannot grant a write to a document you
  cannot read. So the guest writes to `rsvps/{code}`, a Cloud Function validates
  the code and seat count, merges into the guest document, and deletes the drop.
- **Registry totals are function-written.** A client-side increment means anyone
  can inflate the number.

## Build order

1. Landing page live, collecting signups. ← start here
2. Auth (phone) + wedding creation + `ownerUid`.
3. Setup wizard — names, date, ceremonies, colours, venue style.
4. Guest list + RSVP drop box + merge function.
5. Roles and the money-hiding rules.
6. Gifts, receipt upload, couple confirmation.
7. WhatsApp composition, seating, find-my-table.
8. Gate check-in and the thank-you engine.

Ship each stage to a real URL before starting the next.

## Running locally

```bash
npm install -g firebase-tools
firebase login
firebase emulators:start          # hosting + firestore + storage + auth
firebase deploy --only hosting    # staging
```

Two projects: `vows-staging` and `vows-prod`, same rules deployed to both.

## Wiring the landing page to Firestore

`public/index.html` calls `saveSignup()`, which falls back to a console log when
no backend is present. To connect it, define `window.VOWS_SAVE` before the page
script runs — it must return a Promise.

```js
window.VOWS_SAVE = function (data) {
  return addDoc(collection(db, "signups"), {
    ...data,
    createdAt: serverTimestamp(),
  });
};
```

## Notes

- The prototype inlines its artwork as base64 (~1.6 MB). Move the images to
  Storage or the hosting bundle before shipping — a guest on mobile data is the
  performance case that matters.
- Palette and contrast: the colour engine derives every text colour from the
  couple's three chosen colours and pushes it until it clears WCAG AA against
  whatever it lands on. Do not hardcode text colours when porting.
- The design is light-only by intent. Pale watercolour art and pastel palettes
  have nothing to invert.
