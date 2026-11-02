/**
 * Landing page — public home screen (unauthenticated visitors).
 * Composes the Hero, Features, and How-It-Works sections.
 */

import { Footer } from '../../components/footer';
import { TopNavBar } from '../../components/top-nav-bar';

import './landing-page.css';

import { FeaturesSection } from './components/features-section';
import { HeroSection } from './components/hero-section';
import { HowItWorksSection } from './components/how-it-works-section';

/**
 * Renders the full landing page with navigation, hero, features, how-it-works, and footer.
 */
function LandingPage() {
  return (
    /* Khung cuộn của riêng trang này.

       styles/index.css đặt html, body và #root ở height: 100vh kèm
       overflow: hidden !important — có từ 571f69b, 23/08/2026 — vì vỏ ứng
       dụng tự quản lý phần cuộn của nó. Trang giới thiệu không nằm trong vỏ
       ấy, nên nội dung 2399px của nó bị cắt trong một khung 900px và người
       dùng không cuộn xuống được — họ chỉ thấy dải đầu.

       Sửa tại đây chứ không nới luật toàn cục: luật đó là thứ giữ cho
       màn chat và các màn đã đăng nhập không sinh ra hai thanh cuộn lồng nhau. */
    <div className="landing">
      <TopNavBar />
      {/* Không đẩy nội dung xuống dưới header. Header trong suốt và đè lên
          dải tối, nên một khoảng đệm 64px ở đây chỉ để lại một vệt sáng trên
          đỉnh trang. */}
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
      </main>
      <Footer />
    </div>
  );
}

export default LandingPage;
