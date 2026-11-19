/**
 * Bộ token thiết kế của UniChat trên di động.
 *
 * Nguồn sự thật là `frontend/src/styles/index.css`. React Native không có
 * custom property, nên `palette` dưới đây là bản sao bằng tay của lớp màu
 * gốc trong `:root` của web, giữ nguyên tên biến (bỏ dấu, camelCase) để đối
 * chiếu được: `--muc-nhat` ở web là `palette.mucNhat` ở đây.
 *
 * Mọi bảng màu khác (`colors`, `workplace`, `dock`, `messenger`, `glass`)
 * chỉ trỏ vào `palette`, không tự khai mã màu. Trước bản này mobile có bốn
 * bảng song song với ba màu nhấn khác nhau cho cùng một vai: nút gửi của
 * Trợ lý AI là `#3346F5`, nút gửi bình luận là navy `#1E3A8A`, còn web dùng
 * `#045CDF` ở cả hai. Gom về một gốc thì web đổi một màu là mobile đổi theo
 * ở đúng một chỗ.
 *
 * Mỗi lần web đổi màu gốc thì phải đổi `palette` theo bằng tay.
 */

/** Lớp màu gốc, chép từ `:root` của web (chế độ sáng). */
export const palette = {
  /** Tờ giấy trắng mà nội dung nằm trên. */
  nen: '#FFFFFF',
  /** Panel, nền màn hình. */
  beMat: '#F6F7F9',
  /** Khung ngoài, bậc sẫm hơn panel. */
  khung: '#E3E6EB',
  noi: '#FFFFFF',
  /** Viền thẻ, viền ô nhập, viền nút phụ. */
  vien: '#D4D8E0',
  /** Đường kẻ phân cách, nền khung bộ chuyển segmented. */
  ke: '#EEF0F3',
  /** Điều khiển đang tắt (nút gửi khi chưa gõ gì). */
  dieuKhien: '#BFC5CF',

  /** Mực chính. Chỉ có hai vai mực; thứ bậc do cỡ chữ và độ đậm gánh. */
  muc: '#151A23',
  mucNhat: '#555C68',
  mucMo: '#5A616C',

  /** Màu nhấn duy nhất: nút chính, chip đang chọn, liên kết. */
  nhan: '#045CDF',
  nhanNhat: '#E5EEFB',
  /** Chữ đặt trên mảng màu nhấn. */
  nhanMuc: '#FFFFFF',
  /** `color-mix(in srgb, --nhan 86%, --muc)`: nút chính khi nhấn. */
  nhanDam: '#0653C5',
  /** Chữ cái trên chip nhận diện nhóm: cố ý không lật theo chế độ. */
  markMuc: '#1F2328',

  /** Thanh bên của web: xanh đậm, không đổi theo chế độ. */
  rayNen: '#151F42',
  rayNoi: '#212E59',
  rayMuc: '#FFFFFF',
  rayMucNhat: '#AEB5CB',
  rayNhan: '#5A9BFC',
  /** `--canh-bao` của chế độ tối web: đọc được trên nền xanh đậm. */
  rayCanhBao: '#D9A23C',

  /** Dải chào của trang nhóm. */
  daiNen: '#2F4FE0',
  daiMuc: '#FFFFFF',
  daiMucNhat: '#D5DCF9',
  daiO: '#2844C1',
  daiOVien: '#5369CD',

  tot: '#2E7D32',
  hong: '#B42318',
  canhBao: '#92400E',

  pillTotNen: '#DCFAE5',
  pillTotMuc: '#04250E',
  pillHongNen: '#FDECEA',
  pillHongMuc: '#7A1D14',
  pillCanhNen: '#FFFBEB',
  pillCanhMuc: '#92400E',
  pillTrungNen: '#ECEEF2',
  pillTrungMuc: '#39404B',

  outline: '#9BA3B1',

  /** Chữ đặt trên ảnh hoặc dải tối cố định: không đổi theo chế độ. */
  trenAnh: '#FFFFFF',
  trenAnhNhat: 'rgba(255, 255, 255, 0.78)',
  trenAnhNen: 'rgba(10, 13, 20, 0.45)',
  trenAnhVien: 'rgba(255, 255, 255, 0.38)',
  /** Nút mờ đặt trên dải tối (góc phải của dải đầu). */
  trenAnhNut: 'rgba(255, 255, 255, 0.12)',
  trenAnhNutVien: 'rgba(255, 255, 255, 0.18)',
} as const;

/**
 * Quy ước nút của web (`--btn-*`): hành động chính tô màu nhấn, hành động
 * phụ là nút viền, cả hai bo viên thuốc. Nút icon (đóng, gửi, đính kèm,
 * quay lại) cũng bo `radius`, tức là tròn.
 */
export const button = {
  radius: 9999,
  primaryBg: palette.nhan,
  primaryInk: palette.nhanMuc,
  primaryBgPressed: palette.nhanDam,
  secondaryBg: palette.nen,
  secondaryInk: palette.muc,
  secondaryBorder: palette.vien,
  secondaryBgPressed: palette.beMat,
  disabledBg: palette.dieuKhien,
} as const;

/** Thẻ nổi bật (mời hỏi trợ lý): `--noi-bat-*` của web. */
export const noiBat = {
  nen: palette.rayNen,
  muc: palette.trenAnh,
  nutNen: palette.trenAnh,
  nutMuc: palette.rayNen,
} as const;

/**
 * Bảng tên kiểu Material, giữ lại vì nhiều màn đang dùng. Mọi giá trị trỏ
 * về `palette`, theo đúng ánh xạ `--color-*` của web.
 */
export const colors = {
  primary: palette.nhan,
  onPrimary: palette.nhanMuc,
  primaryContainer: palette.nhanDam,
  onPrimaryContainer: palette.nhanNhat,
  inversePrimary: palette.rayNhan,
  primaryFixed: palette.nhanNhat,
  onPrimaryFixed: palette.nhan,

  surface: palette.beMat,
  surfaceDim: palette.khung,
  surfaceBright: palette.nen,
  surfaceContainerLowest: palette.nen,
  surfaceContainerLow: '#FAFBFC',
  surfaceContainer: palette.beMat,
  surfaceContainerHigh: palette.ke,
  surfaceContainerHighest: palette.khung,
  onSurface: palette.muc,
  onSurfaceVariant: palette.mucNhat,
  inverseSurface: '#242A34',
  inverseOnSurface: palette.beMat,

  outline: palette.outline,
  outlineVariant: palette.vien,

  error: palette.hong,
  onError: palette.nen,
  errorContainer: palette.pillHongNen,
  onErrorContainer: palette.pillHongMuc,
  success: palette.tot,
  warning: palette.canhBao,
  aiBubble: palette.nen,
  aiBubbleBorder: palette.vien,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Bo góc, theo `--radius-*` của web. Thẻ 22, điều khiển bo tròn hẳn. */
export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 22,
  '3xl': 28,
  full: 9999,
} as const;

/** Lớp kính mờ của màn Quên mật khẩu; màu nền lấy từ `palette`. */
export const glass = {
  surface: 'rgba(255, 255, 255, 0.78)',
  surfaceHeavy: 'rgba(255, 255, 255, 0.88)',
  surfaceLight: 'rgba(255, 255, 255, 0.55)',
  surfaceUltraLight: 'rgba(255, 255, 255, 0.35)',
  surfaceNavy: 'rgba(21, 31, 66, 0.92)',
  surfaceTeal: 'rgba(4, 92, 223, 0.88)',
  border: 'rgba(255, 255, 255, 0.85)',
  borderSubtle: 'rgba(212, 216, 224, 0.65)',
  borderAccent: 'rgba(90, 155, 252, 0.35)',
  borderNavy: 'rgba(174, 181, 203, 0.28)',
  highlight: 'rgba(255, 255, 255, 0.95)',
  highlightShimmer: 'rgba(255, 255, 255, 0.6)',
  innerGlow: 'rgba(90, 155, 252, 0.12)',
  refractionStart: 'rgba(255, 255, 255, 0.4)',
  refractionEnd: 'rgba(255, 255, 255, 0.0)',
  ambientNavy: palette.rayNen,
  ambientTeal: palette.nhan,
  ambientCyan: palette.rayNhan,
  ambientViolet: 'rgba(90, 155, 252, 0.25)',
} as const;

/**
 * Centralized animation configuration for liquid glass motion.
 * Spring configs tuned for native-feel physics on iOS/Android.
 */
export const animation = {
  /** Smooth settling — cards, capsules, layout shifts */
  springSmooth: { damping: 22, stiffness: 180, mass: 0.9 },
  /** Bouncy tactile — buttons, tab icons, micro-interactions */
  springBouncy: { damping: 14, stiffness: 200, mass: 0.7 },
  /** Snappy precise — sliding indicators, focus transitions */
  springSnappy: { damping: 28, stiffness: 350, mass: 0.6 },
  /** Durations in ms */
  durationFast: 150,
  durationMedium: 280,
  durationSlow: 450,
  /** Stagger delay per item for list entrance animations */
  staggerDelay: 60,
} as const;

/**
 * Bề mặt làm việc: bản sao khối `--ws-*` của web, trỏ đúng vào cùng các màu
 * gốc như ở web. `accent` là màu bão hòa duy nhất, dành cho thứ người đọc
 * cần bấm, nên tiêu đề thẻ giữ `ink`.
 */
export const workplace = {
  canvas: palette.beMat,
  card: palette.nen,
  line: palette.ke,
  chip: palette.pillTrungNen,

  ink: palette.muc,
  inkSoft: palette.mucNhat,
  inkMuted: palette.mucMo,

  accent: palette.nhan,
  accentInk: palette.nhanMuc,
  accentSoft: palette.nhanNhat,

  okBg: palette.pillTotNen,
  okInk: palette.pillTotMuc,
  warnBg: palette.pillCanhNen,
  warnInk: palette.pillCanhMuc,
  alert: palette.hong,
} as const;

/**
 * Thanh điều hướng dạng dock tối, với nút Hỏi AI nổi ở giữa.
 *
 * Nền là `--ray-nen`, cùng màu thanh bên của web, để hai bản dùng chung một
 * khối điều hướng xanh đậm. `accent` là màu nhấn chung của sản phẩm.
 */
export const dock = {
  surface: palette.rayNen,
  border: 'rgba(255, 255, 255, 0.06)',
  icon: palette.rayMucNhat,
  iconActive: palette.rayMuc,
  accent: palette.nhan,
  accentPressed: palette.nhanDam,
  badge: palette.hong,
} as const;

/** Màn Tin nhắn: nền, bong bóng và các viên thông tin trong luồng chat. */
export const messenger = {
  canvas: palette.beMat,
  card: palette.nen,
  line: palette.ke,
  mine: palette.nhan,
  mineInk: palette.nhanMuc,
  theirs: palette.nen,
  theirsInk: palette.muc,
  chip: palette.ke,
  chipInk: palette.mucNhat,
  field: palette.ke,
  missedInk: palette.hong,
  missedBorder: palette.pillHongNen,
  missedIconBg: palette.pillHongNen,
  okIconBg: palette.pillTotNen,
  okIcon: palette.tot,
  disabled: palette.dieuKhien,
} as const;

export type PaletteToken = keyof typeof palette;
export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
export type RadiiToken = keyof typeof radii;
export type GlassToken = keyof typeof glass;
export type AnimationToken = keyof typeof animation;
export type WorkplaceToken = keyof typeof workplace;
