# Icons (77)

Phosphor **Duotone**, 256 viewBox, `fill="currentColor"` (the 20% layer is built in via `opacity`). Colour comes from the parent text colour.

Sizes: 16 inline, 20 inside controls, 24 standalone, 32 and 48 for empty states. Always `aria-hidden`, unless the icon is the only content, then use `title`/`aria-label` on the control.

```tsx
import { Icon, MagnifyingGlass } from "@/icons";
<Icon name="search" size={20} />
<MagnifyingGlass size={24} className="text-action" />
```

| DS key | File | Component |
|---|---|---|
| `search` | `svg/magnifying-glass.svg` | `MagnifyingGlass` |
| `check` | `svg/check.svg` | `Check` |
| `x` | `svg/x.svg` | `X` |
| `chevron-down` | `svg/caret-down.svg` | `CaretDown` |
| `arrow-right` | `svg/arrow-right.svg` | `ArrowRight` |
| `plus` | `svg/plus.svg` | `Plus` |
| `download` | `svg/download-simple.svg` | `DownloadSimple` |
| `upload` | `svg/upload-simple.svg` | `UploadSimple` |
| `file` | `svg/file-text.svg` | `FileText` |
| `mail` | `svg/envelope.svg` | `Envelope` |
| `warn` | `svg/warning.svg` | `Warning` |
| `alert` | `svg/warning-circle.svg` | `WarningCircle` |
| `info` | `svg/info.svg` | `Info` |
| `ok` | `svg/check-circle.svg` | `CheckCircle` |
| `shield` | `svg/shield-check.svg` | `ShieldCheck` |
| `package` | `svg/package.svg` | `Package` |
| `globe` | `svg/globe.svg` | `Globe` |
| `msg` | `svg/chat-circle.svg` | `ChatCircle` |
| `send` | `svg/paper-plane-tilt.svg` | `PaperPlaneTilt` |
| `more` | `svg/dots-three.svg` | `DotsThree` |
| `trash` | `svg/trash.svg` | `Trash` |
| `clock` | `svg/clock.svg` | `Clock` |
| `lock` | `svg/lock.svg` | `Lock` |
| `filter` | `svg/funnel.svg` | `Funnel` |
| `ship` | `svg/boat.svg` | `Boat` |
| `image` | `svg/image.svg` | `Image` |
| `building` | `svg/buildings.svg` | `Buildings` |
| `star` | `svg/star.svg` | `Star` |
| `user` | `svg/user.svg` | `User` |
| `edit` | `svg/pencil-simple.svg` | `PencilSimple` |
| `copy` | `svg/copy.svg` | `Copy` |
| `verified` | `svg/seal-check.svg` | `SealCheck` |
| `handshake` | `svg/handshake.svg` | `Handshake` |
| `certificate` | `svg/certificate.svg` | `Certificate` |
| `receipt` | `svg/receipt.svg` | `Receipt` |
| `pin` | `svg/map-pin.svg` | `MapPin` |
| `calendar` | `svg/calendar-blank.svg` | `CalendarBlank` |
| `factory` | `svg/factory.svg` | `Factory` |
| `store` | `svg/storefront.svg` | `Storefront` |
| `truck` | `svg/truck.svg` | `Truck` |
| `dollar` | `svg/currency-dollar.svg` | `CurrencyDollar` |
| `bell` | `svg/bell.svg` | `Bell` |
| `pdf` | `svg/file-pdf.svg` | `FilePdf` |
| `clipboard` | `svg/clipboard-text.svg` | `ClipboardText` |
| `external` | `svg/arrow-up-right.svg` | `ArrowUpRight` |
| `eye` | `svg/eye.svg` | `Eye` |
| `heart` | `svg/heart.svg` | `Heart` |
| `home` | `svg/house.svg` | `House` |
| `list` | `svg/list.svg` | `List` |
| `circle` | `svg/circle.svg` | `Circle` |
| `minus` | `svg/minus.svg` | `Minus` |
| `chevron-right` | `svg/caret-right.svg` | `CaretRight` |
| `chevron-left` | `svg/caret-left.svg` | `CaretLeft` |
| `sort` | `svg/caret-up-down.svg` | `CaretUpDown` |
| `sort-asc` | `svg/sort-ascending.svg` | `SortAscending` |
| `sort-desc` | `svg/sort-descending.svg` | `SortDescending` |
| `caret-up` | `svg/caret-up.svg` | `CaretUp` |
| `columns` | `svg/columns.svg` | `Columns` |
| `pushpin` | `svg/push-pin.svg` | `PushPin` |
| `eye-off` | `svg/eye-slash.svg` | `EyeSlash` |
| `rows` | `svg/rows.svg` | `Rows` |
| `export` | `svg/export.svg` | `Export` |
| `refresh` | `svg/arrows-clockwise.svg` | `ArrowsClockwise` |
| `sliders` | `svg/sliders-horizontal.svg` | `SlidersHorizontal` |
| `command` | `svg/command.svg` | `Command` |
| `sidebar` | `svg/sidebar-simple.svg` | `SidebarSimple` |
| `gear` | `svg/gear.svg` | `Gear` |
| `sign-out` | `svg/sign-out.svg` | `SignOut` |
| `question` | `svg/question.svg` | `Question` |
| `folder` | `svg/folder.svg` | `Folder` |
| `chart` | `svg/chart-bar.svg` | `ChartBar` |
| `grip` | `svg/dots-six-vertical.svg` | `DotsSixVertical` |
| `archive` | `svg/archive.svg` | `Archive` |
| `link` | `svg/link.svg` | `Link` |
| `x-circle` | `svg/x-circle.svg` | `XCircle` |
| `arrow-down` | `svg/arrow-down.svg` | `ArrowDown` |
| `arrow-up` | `svg/arrow-up.svg` | `ArrowUp` |

Need another icon? Pick it from phosphoricons.com in **Duotone**, add it with the same markup, and register it in `index.tsx`.
