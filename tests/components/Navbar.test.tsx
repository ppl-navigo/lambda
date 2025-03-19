import { render, screen } from "@testing-library/react"
import Navbar from "../../app/components/Navbar"
import "@testing-library/jest-dom"
import userEvent from "@testing-library/user-event"

describe("Navbar", () => {
  it("renders the Navigo logo", () => {
    render(<Navbar />)
    const logo = screen.getByAltText("Navigo Logo") 
    expect(logo).toBeInTheDocument()
  })
  it("renders all navigation links", () => {
    render(<Navbar />)
    expect(screen.getByText("Home")).toBeInTheDocument()
    expect(screen.getByText("About Us")).toBeInTheDocument()
    expect(screen.getByText("Services")).toBeInTheDocument()
    expect(screen.getByText("Testimonials")).toBeInTheDocument()
  })

  it("opens the mobile menu when clicked", async () => {
    render(<Navbar />)

    // Click the menu button
    const menuButton = screen.getByRole("button", { name: /open menu/i })
    await userEvent.click(menuButton)

    // Check that at least one of each link is visible in the mobile menu
    const homeLinks = screen.getAllByText("Home")
    expect(
      homeLinks.some((link) => link.getAttribute("class")?.includes("block"))
    ).toBe(true)

    const aboutLinks = screen.getAllByText("About Us")
    expect(
      aboutLinks.some((link) => link.getAttribute("class")?.includes("block"))
    ).toBe(true)

    const servicesLinks = screen.getAllByText("Services")
    expect(
      servicesLinks.some((link) =>
        link.getAttribute("class")?.includes("block")
      )
    ).toBe(true)

    const testimonialsLinks = screen.getAllByText("Testimonials")
    expect(
      testimonialsLinks.some((link) =>
        link.getAttribute("class")?.includes("block")
      )
    ).toBe(true)
  })
})
