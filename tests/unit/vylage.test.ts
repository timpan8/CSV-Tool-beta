import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { arUppe, egenVy, oppnaVy, stangVy, vylage } from '../../src/state/vylage.js'
import { oppnaPivot, pivotOppen, stangPivot } from '../../src/state/pivot.js'
import { oppnaSlaIhop, slaIhopOppen, stangSlaIhop } from '../../src/state/slaihop.js'
import { jamforOppen, oppnaJamfor } from '../../src/state/jamfor.js'
import { kombineraOppen, oppnaKombinera, begarMall } from '../../src/state/kombinera.js'

describe('vylage', () => {
  beforeEach(() => stangVy())

  it('börjar i rutnätet', () => {
    expect(vylage.value.typ).toBe('rutnat')
    expect(egenVy.value).toBe(false)
  })

  it('att öppna en vy ersätter den som var uppe', () => {
    oppnaSlaIhop()
    expect(slaIhopOppen.value).toBe(true)
    // Det här var buggen: Jämför öppnad ovanpå Slå ihop lämnade Slå ihop
    // öppen under, och Escape stängde den dolda först.
    oppnaJamfor()
    expect(jamforOppen.value).toBe(true)
    expect(slaIhopOppen.value).toBe(false)
    expect(vylage.value.typ).toBe('jamfor')
    expect(egenVy.value).toBe(true)
  })

  it('stänger bara den vy som är uppe när en typ anges', () => {
    oppnaPivot()
    oppnaJamfor()
    // En sen stängning av pivoten ska inte stänga jämförelsen.
    stangPivot()
    expect(vylage.value.typ).toBe('jamfor')
    stangVy('jamfor')
    expect(vylage.value.typ).toBe('rutnat')
  })

  it('stänger vad som än är uppe utan typ', () => {
    oppnaKombinera()
    stangVy()
    expect(kombineraOppen.value).toBe(false)
    expect(vylage.value.typ).toBe('rutnat')
  })

  it('aliasen i vyernas moduler följer samma värde', () => {
    oppnaPivot()
    expect(pivotOppen.value).toBe(true)
    expect(arUppe('pivot').value).toBe(true)
    stangSlaIhop() // fel vy — ingen verkan
    expect(pivotOppen.value).toBe(true)
    stangPivot()
    expect(pivotOppen.value).toBe(false)
  })

  it('kombineringens mallärende sätts av öppningen', () => {
    oppnaKombinera(true)
    expect(begarMall.value).toBe(true)
    oppnaVy({ typ: 'rutnat' })
    expect(kombineraOppen.value).toBe(false)
  })

  /*
   * Aliasen är härledda och går inte att skriva till. Det här testet faller
   * om någon kodväg återinför en egen flagga i stället för att gå via
   * `oppnaVy`/`stangVy` — det är så två vyer skulle kunna bli öppna samtidigt
   * igen.
   */
  it('ingen fil skriver till de gamla flaggorna', () => {
    const filer: string[] = []
    const ga = (katalog: string) => {
      for (const namn of readdirSync(katalog)) {
        const p = join(katalog, namn)
        if (statSync(p).isDirectory()) ga(p)
        else if (/\.tsx?$/.test(namn)) filer.push(p)
      }
    }
    ga('src')
    const monster = /\b(pivotOppen|slaIhopOppen|jamforOppen|kombineraOppen|verkstadOppen)\.value\s*=[^=]/
    const syndare = filer.filter((f) => monster.test(readFileSync(f, 'utf8')))
    expect(syndare).toEqual([])
  })
})
