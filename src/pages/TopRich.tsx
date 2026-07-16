import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TopRichSection from '@/components/TopRichSection';

const TopRich = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <TopRichSection />
      </main>
      <Footer />
    </div>
  );
};

export default TopRich;
