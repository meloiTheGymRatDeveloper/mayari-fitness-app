import { colors, fonts, typography, radii, labelStyle } from '../../constants/theme';

describe('theme tokens', () => {
  it('has gold brand tokens', () => {
    expect(colors.brand.gold).toBe('#C4A55A');
    expect(colors.brand.goldLight).toBe('#EDD280');
  });

  it('has icon state tokens', () => {
    expect(colors.icon.inactive).toBe('#8A8AB0');
    expect(colors.icon.active).toBe('#EDD280');
  });

  it('has updated bg tokens', () => {
    expect(colors.bg.tabBar).toBe('#0C0C22');
    expect(colors.bg.secondary).toBe('#12122A');
    expect(colors.bg.elevated).toBe('#181836');
  });

  it('exports fonts object with 5 weights', () => {
    expect(Object.keys(fonts)).toHaveLength(5);
    expect(fonts.bold).toBe('PlusJakartaSans_700Bold');
  });

  it('exports radii with 5 sizes', () => {
    expect(radii.sm).toBe(8);
    expect(radii.full).toBe(9999);
  });

  it('exports labelStyle with gold color and uppercase transform', () => {
    expect(labelStyle.color).toBe('#C4A55A');
    expect(labelStyle.textTransform).toBe('uppercase');
    expect(labelStyle.fontFamily).toBe('PlusJakartaSans_700Bold');
  });

  it('has tightened typography scale', () => {
    expect(typography.xs).toBe(11);
    expect(typography.base).toBe(15);
    expect(typography['2xl']).toBe(22);
  });
});
