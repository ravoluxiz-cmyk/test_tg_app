import ChessBackground from "@/components/ChessBackground";
import { HoverButton } from "@/components/ui/hover-button";
import { ShoppingBag, Calendar, GraduationCap } from "lucide-react";

export default function Home() {
  return (
    <ChessBackground>

      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 text-center">
        <div className="flex flex-col gap-6 sm:gap-8 md:gap-10 items-center justify-center min-h-screen py-8">
          {/* Title */}
          <div className="flex flex-col items-center gap-2 mb-8">
            <h1 className="text-7xl xs:text-8xl sm:text-9xl md:text-[10rem] lg:text-[12rem] xl:text-[14rem] font-black tracking-tighter leading-none px-4">
              <span className="text-white uppercase" style={{ fontFamily: 'Arial Black, sans-serif', letterSpacing: '-0.05em' }}>
                REP
              </span>
            </h1>
            <h1 className="text-7xl xs:text-8xl sm:text-9xl md:text-[10rem] lg:text-[12rem] xl:text-[14rem] font-black tracking-tighter leading-none px-4">
              <span className="text-white uppercase" style={{ fontFamily: 'Arial Black, sans-serif', letterSpacing: '-0.05em' }}>
                CHESS
              </span>
            </h1>
          </div>

          {/* Buttons - optimized for mobile */}
          <div className="flex flex-col w-full max-w-xs sm:max-w-md md:max-w-2xl gap-4 px-4">
            <HoverButton className="flex items-center justify-center gap-3">
              <ShoppingBag className="w-7 h-7 text-white flex-shrink-0" />
              <span className="text-xl sm:text-2xl text-white font-black uppercase tracking-tight" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                Купить мерч
              </span>
            </HoverButton>

            <HoverButton className="flex items-center justify-center gap-3">
              <Calendar className="w-7 h-7 text-white flex-shrink-0" />
              <span className="text-xl sm:text-2xl text-white font-black uppercase tracking-tight" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                Расписание турниров
              </span>
            </HoverButton>

            <HoverButton className="flex items-center justify-center gap-3">
              <GraduationCap className="w-7 h-7 text-white flex-shrink-0" />
              <span className="text-xl sm:text-2xl text-white font-black uppercase tracking-tight" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                Запись на урок
              </span>
            </HoverButton>
          </div>
        </div>
      </div>
    </ChessBackground>
  );
}
